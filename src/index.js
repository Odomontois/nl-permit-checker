const { chromium } = require('playwright');
const { exec } = require("child_process");
const notifier = require('node-notifier');

const NL_PERMIT_SCHEDULE_URL = 'https://oap.ind.nl/oap/en/#/doc';

const DESK_VALUES = {
  AMSTERDAM: '1: Object',
  DEN_HAAG: '2: Object',
  ZWOLLE: '3: Object',
  DEN_BOSCH: '4: Object'
};

const TIME_OPTIONS = {
  // just use first available
  FIRST: '1: Object'
};

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const timeFormatter = new Intl.DateTimeFormat(
  'en-us',
  { hour: 'numeric', minute: 'numeric', second: 'numeric' }
);

const log = message => {
  console.log(`[${timeFormatter.format(new Date())}]: ${message}`);
};

const notify = () => {
  // set up telegram-send if you have a TG bot to recieve notifications through it
  //exec('telegram-send "FOUND IND SLOT !!!!!"')
  notifier.notify({
    title: 'NL Permit appointment available!',
    message: 'Could you please to go to the bot Chromium instance and the filling form',
    sound: true,
    wait: true
  });
}

const selectDesk = async (page, desk) => {
  await page.selectOption('#desk', desk);
}

const incrementMonth = async page => {
  await page.locator('available-date-picker button.pull-right').click();
};

/**
 * 
 * @param {import('playwright').Page} page 
 */
const incrementPeople = async page => {
  await page.locator('oap-form-number div.number-up').click();
}

const tryToFindAvailableDate = async page => {
  try {
    // select date
    const locator = page.locator(
      'available-date-picker tbody tr button.btn-sm.available'
    ).first();
    await locator.waitFor({ timeout: 500 });
    await locator.click();

    // select time
    await page.selectOption('#timeSlot', TIME_OPTIONS.FIRST);

    // start filling
    await page.locator(
      'button.pull-right[type="submit"]:has-text("To details")'
    ).click();

    notify();
  } catch (e) {
    let delay = randomInteger(2000, 5000);
    log('Not available dates, next check in ' + delay + " ms");
    setTimeout(() => check(page), delay);
  }
}

/**
 * @param {import('playwright').Page} page
 */
const check = async page => {
  let retries = 30;
  while (true) {
    try {
      await page.goto(NL_PERMIT_SCHEDULE_URL);
      break
    } catch (error) {
      retries--;
      if (retries < 0) {
        console.log("too many retries, exiting");
        throw error;
      }
      console.log(`caught ${error}, retrying`)
    }
  }

  log('Page reloaded');

  await selectDesk(page, DESK_VALUES.AMSTERDAM);

  await incrementPeople(page);

  if (process.argv[2] == 'NOV') {
    await incrementMonth(page);
  }

  await tryToFindAvailableDate(page);
};
/**
 * 
 * @param {chromium.Page} page 
 * @returns 
 */
const runChecker = (page) => new Promise(() => {
  check(page);
});

const run = async () => {
  console.log(
    `

!!! Be ready to filling the appointment form  !!!
Could you please prepare:
- your email
- your phone (NL prefer)
- V-number (form IND approval letter)
- First name (which you are using in documents)
- Last name (which you are using in documents)


`
  );
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await runChecker(page);
  await browser.close();
};

run();


