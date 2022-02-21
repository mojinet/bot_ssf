import {config} from 'dotenv-flow'
import puppeteer from 'puppeteer'
import dappeteer from '@chainsafe/dappeteer'

// Hydration de process.env à partir des fichiers .env & .env.local à la racine du projet
config()

// PK des sous-compte
const subAcount = [
	null, // pour que la premiere execution se fasse sur le compte principale
	process.env.METAMASK_SUBACCOUNT_1,
	process.env.METAMASK_SUBACCOUNT_2,
	process.env.METAMASK_SUBACCOUNT_3,
	process.env.METAMASK_SUBACCOUNT_4
]

// Opération principale
const main = async (acount) => {

	// initialise les variables de controle
	let success = false // sort de la boucle en cas de succes
	let firstTry = true; // indique si c'est le premier essai

	//switch sur sous-compte
	if(acount != null){
		await metamask.importPK(acount)
		console.log('Import du compte '+ acountNumber +' réussie')
	}

	while (!success) {

		// Ouverture de la page de jeu
		console.log('Ouverture de la page')
		var page = await browser.newPage()
		await page.setViewport({width: 1280, height: 800}) // fix bug sur selection resource
		await page.goto(process.env.GAME_URL, {
			waitUntil: 'networkidle2',
		})
		await page.bringToFront() // retour au premier plan

		// Connexion de metamask au jeu pour le premier essai
		if (firstTry){
			console.log('Premiere tentative')
			const connectButton = await page.$('#welcome .button')
			await connectButton.click()
			await metamask.approve()
		}else{
			console.log('/!| Nouvelle tentative')
		}

		// on attend que l'interface charge
		console.log('wait : chargement de la page')
		await page.bringToFront() // retour au premier plan
		await page.waitForSelector('#halvening-banner', {visible: true})
		await page.waitForTimeout(1000)

		// Selection de la ressource
		console.log('selection de la ressource N°' + process.env.RESSOURCE_NUMBER)
		await page.click('#basket .basket-fruit')
		await page.waitForSelector('.box-panel:nth-child('+ process.env.RESSOURCE_NUMBER +')', {visible: true})
		await page.click('.box-panel:nth-child('+ process.env.RESSOURCE_NUMBER +')')
		await page.click('.close-icon')
		await page.waitForTimeout(500)

		// Recolte
		await page.click('.'+ process.env.NAME_OF_TILES + ':nth-child(6)')
		await page.click('.'+ process.env.NAME_OF_TILES + ':nth-child(6)')
		await page.click('.'+ process.env.NAME_OF_TILES + ':nth-child(7)')
		await page.click('.'+ process.env.NAME_OF_TILES + ':nth-child(7)')
		await page.click('.'+ process.env.NAME_OF_TILES + ':nth-child(8)')
		await page.click('.'+ process.env.NAME_OF_TILES + ':nth-child(8)')
		await page.click('.'+ process.env.NAME_OF_TILES + ':nth-child(9)')
		await page.click('.'+ process.env.NAME_OF_TILES + ':nth-child(9)')
		await page.click('.'+ process.env.NAME_OF_TILES + ':nth-child(10)')
		await page.click('.'+ process.env.NAME_OF_TILES + ':nth-child(10)')
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
				console.log('/!| sauvegarde non raisonable : nouvelle tentative')
				firstTry = false
			}
		}else{
			console.log('/!| sauvegarde indisponible')
			success = true
		}
	}
	// fin des opérations
	browser.close()
	acountNumber++
	console.log('Fermeture de la page')
	console.log('Operation terminer pour ce compte')
}

// Fonction d'attente
function timeout(timeBeforeStart) {
	return new Promise(resolve => setTimeout(resolve, timeBeforeStart));
}
async function sleep(timeBeforeStart) {
	await timeout(timeBeforeStart);
	return true;
}

// Boucle principale
while (true){

	// initialisation des variables de controle
	let startTime = new Date().getTime()
	let endTime = 0
	var acountNumber = 1
	console.log('***** Wake up !')

	// opération principale sur le jeu pour chaque compte
	for (const acount of subAcount) {
		// initialisation des variables browser et metamask
		var browser = await dappeteer.launch(puppeteer, {
			metamaskVersion: dappeteer.RECOMMENDED_METAMASK_VERSION,
		})
		var metamask = await dappeteer.setupMetamask(browser, {
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

		console.log('----- Démarage des opérations pour ce compte')
		await main(acount)
	}

	// relance le processus tout les DELAY_BETWEEN_REPEAT ms
	await browser.close()
	endTime = new Date().getTime() - startTime;
	let timeBeforeStart = process.env.DELAY_BETWEEN_REPEAT - endTime;
	console.log('----- fin des opérations : redemarage dans ' + Math.ceil(timeBeforeStart / 1000 / 60) + ' mn')
	await sleep(timeBeforeStart)
}
