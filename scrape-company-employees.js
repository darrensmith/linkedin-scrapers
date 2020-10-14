

/*
    LinkedIn Scrapers: "Scrape Company Employees"
    Copyright 2020, Darren Smith

    Run as: "node scrape-company-employees.js [Email] [Password] [CompanyName] [OutputFile]"
*/


const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

const args = process.argv;
var start, username, password, company, outputFile
start = 2;
for (var i = start; i < args.length; i++) {
  if(start == 2 && i == 2) { username = args[2] }
  if(start == 2 && i == 3) { password = args[3] }
  if(start == 2 && i == 4) { company = args[4] }
  if(start == 2 && i == 5) { outputFile = args[5] }
}

async function main() {
  const browser = await puppeteer.launch({headless: false});
  const page = await browser.newPage();
  await page.setViewport({width: 1200, height: 720});
  await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle0' });
  await page.type('#username', username);
  await page.type('#password', password);
  await page.click('button[type="submit"]');
  await page.waitFor(1000);
  await page.goto('https://www.linkedin.com/company/' + company + "/");
  await page.waitFor(100);
  const content = await page.evaluate(() => new XMLSerializer().serializeToString(document));
  let $ = cheerio.load(content);
  const baseUri = await $('.mt2>a.link-without-visited-state').attr("href");
  await page.click('.mt2>a.link-without-visited-state');
  maxPageNumber = 1;
  maxOut = false;
  while (maxOut == false) {
    await page.goto("https://www.linkedin.com" + baseUri + '&page=' + maxPageNumber);
    await page.waitFor(100);
    await autoScroll(page);
    const content = await page.evaluate(() => new XMLSerializer().serializeToString(document));
    let $ = cheerio.load(content);
    await $('.search-results__list > li.search-result > div.search-entity > div.search-result__wrapper > div.search-result__info').each(async function( index ) {
      var name = $( this ).children("a.search-result__result-link").children("h3").children(".name-and-icon").children(".name-and-distance").children(".name").text();
      name = name.replace(/[\t\n\r]/gm,'').trim().replace(/,/g, ' - ');
      var href = $( this ).children("a.search-result__result-link").attr("href");
      href = href.replace(/[\t\n\r]/gm,'').trim().replace(/,/g, ' - ');
      var tagline = $( this ).children("p.subline-level-1").text();
      tagline = tagline.replace(/[\t\n\r]/gm,'').trim().replace(/,/g, ' - ');
      var location = $( this ).children("p.subline-level-2").text();
      location = location.replace(/[\t\n\r]/gm,'').trim().replace(/,/g, ' - ');
      csv = name + "," + href + "," + tagline + "," + location + "\r\n";
      var fs = require("fs");
      fs.appendFile(outputFile, csv, function(err, result) { if(err) { console.log(err) }; });
    });
    if($(".search-no-results>div>h1").text() == "No results found.") {
      maxOut = true;
      await browser.close();
    }
    maxPageNumber++;
  }
}

async function autoScroll(page){
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if(totalHeight >= scrollHeight){
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

main();