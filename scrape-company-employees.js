
/*
    LinkedIn Scrapers: "Scrape Company Employees"
    Copyright 2020, Darren Smith

    Run as: "node scrape-company-employees.js [CompanyName] [OutputFile]" to scrape
    Or as: "node scrape-company-employees.js" to create a new login session
*/


// Setup:
const puppeteer = require('puppeteer'), cheerio = require('cheerio');
const args = process.argv, fs = require("fs"), fsp = require("fs").promises;
var company, outputFile;
company = args[2], outputFile = args[3];


// Main:
async function main() {
  const browser = await puppeteer.launch({headless: false});
  const page = await browser.newPage();
  await page.setViewport({width: 1200, height: 720});
  try { var cookieFileExists = await fsp.stat('./cookies.json', {}); }
  catch(err) { var cookieFileExists = false; }
  if(cookieFileExists){
    const cookiesString = await fsp.readFile('./cookies.json');
    var cookies = JSON.parse(cookiesString);
    await page.setCookie(...cookies);
  }
  if(outputFile && cookieFileExists){
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
  } else {
    await page.goto('https://www.linkedin.com/login');
    await page.waitFor(120000);
    cookies = await page.cookies();
    await fsp.writeFile('./cookies.json', JSON.stringify(cookies, null, 2));
  }
  await browser.close();
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