# bot_ssf
a little task automation bot for P2E ssf-like

## instalation
```
npm install
```
copy .env to .env.local and edit file

## Fix dappeteer
### fix metamask.approve()
change dist>metamask>approve.js add after line 16 ```yield page.waitForTimeout(1000)``` 
### fix metamask.import()
change dist>metamask>import.js replace line 21 by```const importButton = yield page.waitForSelector('button.btn-primary');```