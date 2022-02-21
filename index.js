import {config} from 'dotenv-flow'
import puppeteer from 'puppeteer'
import dappeteer from '@chainsafe/dappeteer'

// Hydration de process.env à partir des fichiers .env & .env.local à la racine du projet
config()

// PK des sous-compte
const subAcount = [
	null, // pour que la premiere execution se fasse sur le compte principale
	// process.env.METAMASK_SUBACCOUNT_1,
	// process.env.METAMASK_SUBACCOUNT_2,
	// process.env.METAMASK_SUBACCOUNT_3,
	// process.env.METAMASK_SUBACCOUNT_4
]

// Opération principale
const main = async (acount) => {

	// initialisation des variables browser et metamask
	let browser = await dappeteer.launch(puppeteer, {
		metamaskVersion: dappeteer.RECOMMENDED_METAMASK_VERSION,
	})
	const metamask = await dappeteer.setupMetamask(browser, {
		seed: process.env.METAMASK_SEED,
		hideSeed: true,
	})

	// ajout et sélection du réseau
	await metamask.addNetwork({
		networkName: process.env.NETWORK_NAME,
		rpc: process.env.RPC,
		chainId: process.env.CHAIN_ID,
		symbol: process.env.SYMBOL,
		explorer: process.env.EXPLORER,
	})
	await metamask.switchNetwork(process.env.NETWORK_NAME)

	//switch sur sous-compte todo a faire...
	// if(acount != null){
	// 	await metamask.importPK(acount)
	// 	await metamask.switchAccount(2)
	// }

	let success = false
	let firstTry = true;
	while (!success) {
		// Ouverture de la page de jeu
		console.log('----- Opération sur le compte')
		const page = await browser.newPage()
		await page.setViewport({width: 1280, height: 800}) // fix bug sur selection resource
		await page.goto(process.env.GAME_URL, {
			waitUntil: 'networkidle2',
		})

		// Connexion de metamask au jeu pour le premier essai
		if (firstTry){
			const connectButton = await page.$('#welcome .button')
			await connectButton.click()
			await metamask.approve()
		}
		await page.bringToFront() // retour au premier plan
		console.log('wait : chargement de la page => 5 secondes') // todo a optimisé en await page.waitForSelector('#basket .message') ?
		await page.waitForTimeout(5000)

		// Selection de la ressource
		await page.click('#basket .message')
		await page.click('.box-panel:nth-child(2)')
		await page.click('.close-icon')
		await page.waitForTimeout(1000) // todo optimiser

		// Recolte
		await page.click('.dirt:nth-child(6)')
		await page.click('.dirt:nth-child(6)')
		await page.click('.dirt:nth-child(7)')
		await page.click('.dirt:nth-child(7)')
		await page.click('.dirt:nth-child(8)')
		await page.click('.dirt:nth-child(8)')
		await page.click('.dirt:nth-child(9)')
		await page.click('.dirt:nth-child(9)')
		await page.click('.dirt:nth-child(10)')
		await page.click('.dirt:nth-child(10)')
		console.log('Recolte terminé')

		// Verification de la disponibilité du bouton de sauvegarde
		const saveActif = await page.evaluate(() => {
			const result = document.querySelector('.pixel-panel .button:first-child')
			return !result.classList.contains('disabled')
		})

		// Si la sauvegarde est disponible
		if (saveActif) {
			// Initialise la sauvegarde
			console.log('Sauvegarde en cours')
			await page.click('.pixel-panel .button:first-child')
			await page.waitForTimeout(1000) // todo optimiser
			await page.click('#save-error-buttons .button');
			await metamask.confirmTransaction()

			// Vérification du prix de la sauvegarde
			const fee = await metamask.page.evaluate(() => {
				return document.querySelector('.currency-display-component__text').innerText
			})
			console.log('fee : ' + fee)
			console.log('wait : chargement de la page : 5 secondes') // todo a optimisé en await page.waitForSelector ?
			await page.waitForTimeout(5000)

			// On enregistre si le cout est raisonable
			if (fee < 0.1 && fee > 0) {
				await metamask.approve()
				success = true
				console.log('sauvegarde effectué')
			} else {
				console.log('sauvegarde non raisonable : nouvelle tentative')
				firstTry = false
			}
		}else{
			console.log('sauvegarde indisponible')
			success = true
		}

		// Fermeture de la page
		await page.bringToFront()
		await page.close()
	}
	console.log('Operation terminer pour ce compte')
}

// todo a fixé
function timer(timeBeforeStart) {
	setTimeout(() => {  console.log('----- fin des opérations : redemarage dans ' + timeBeforeStart / 1000 / 60 / 60 + ' mn') }, timeBeforeStart);
}

// Boucle principale : infinie
while (true){
	// initialisation de la mesure du temps d'execution
	let startTime = new Date().getTime();
	let endTime = 0;

	// opération principale sur le jeu pour chaque compte
	for (const acount of subAcount) {
		console.log('ITERATION PRINCIPAL') //todo remove
		await main(acount)
	}

	// relance le processus 1h apres todo a fixé
	endTime = new Date().getTime() - startTime;
	let timeBeforeStart = process.env.DELAY_BETWEEN_REPEAT - endTime;
	await timer(timeBeforeStart)
}
