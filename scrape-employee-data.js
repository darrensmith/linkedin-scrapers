
/*
    LinkedIn Scrapers: "Scrape Employee Data"
    Copyright 2020, Darren Smith

    Run as: "node scrape-employee-data.js [InputFile] [OutputFile]" to scrape
    Or as: "node scrape-employee-data.js" to create a new login session
*/


// Setup:
const puppeteer = require('puppeteer'), cheerio = require('cheerio');
const args = process.argv, fs = require("fs"), fsp = require("fs").promises;
var inputFile, outputFile, input, output = [];
inputFile = args[2], outputFile = args[3];


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
  if(outputFile && cookieFileExists) {
    for (var i = 0; i < input.length; i++) {
      if(input[i][1]) {
        await page.goto('https://www.linkedin.com' + input[i][1]);
        await page.waitFor(500);
        try { await page.click('a.lt-line-clamp__more'); } catch(err) { null; }
        var selector = 'button.link';
        await page.waitForSelector(selector);
        await autoScroll(page);
        await page.evaluate((Selector) => {
          const allButtons = document.querySelectorAll(Selector);
          for (let i = 0; i < allButtons.length; i++) {
            allButtons[i].click();
          }
        }, selector);
        await page.evaluate(() => {
          const skillsButton = document.querySelectorAll('button.pv-skills-section__additional-skills');
          skillsButton[0].click();
        });
        selector = 'a.lt-line-clamp__more';
        await page.waitForSelector(selector);
        await page.evaluate((Selector) => {
          const allButtons = document.querySelectorAll(Selector);
          for (let i = 0; i < allButtons.length; i++) {
            allButtons[i].click();
          }
        }, selector);
        const content = await page.content();
        let $ = cheerio.load(content);
        var profile = {};

        // Get Basic Profile Information:
        profile.name = $("div.mr5>ul>li.t-24").text().replace(/[\t\n\r]/gm,' ').trim();
        profile.degree = $("div.mr5>ul.align-items-center>li.t-16>span>span.dist-value").text().replace(/[\t\n\r]/gm,' ').trim();
        profile.tagline = $("div.mr5>h2").text().replace(/[\t\n\r]/gm,' ').trim();
        profile.location = $("div.mr5>ul.mt1>li").first().text().replace(/[\t\n\r]/gm,' ').trim();
        profile.connections = $("div.mr5>ul.mt1>li:nth-child(2)>span").text().replace(/[\t\n\r]/gm,' ').trim();
        try {
          profile.about = await $("p.pv-about__summary-text>span").text().replace(/[\t\n\r]/gm,' ').trim();
          profile.about = profile.about.replace("see more", "").trim();
        } catch(err) { null; }
        profile.experience = [], profile.education = [];
        profile.skills = [], profile.recommendations = {};
        profile.recommendations.received = [], profile.recommendations.given = [];


        // Fill Experience Section:
        try {
          await $("#experience-section > ul > li").each(async function( index ) {
            var exp = {};
            if(!$(this).children("section").children("ul").text()) {
              exp.company = $(this).children("section").children("div").children("div").children("a").children("div.pv-entity__summary-info").children("p.pv-entity__secondary-title").text().replace(/[\t\n\r]/gm,' ').trim();
              exp.company = exp.company.replace("Full-time", "").trim();
              exp.company = exp.company.replace("Contract", "").trim();
              exp.company = exp.company.replace("Part-time", "").trim();
              exp.positions = [];
              var position = {};
              position.title = $(this).children("section").children("div").children("div").children("a").children("div.pv-entity__summary-info").children("h3").text().replace(/[\t\n\r]/gm,' ').trim();
              position.datesEmployed = $(this).children("section").children("div").children("div").children("a").children("div.pv-entity__summary-info").children("div.display-flex").children("h4").first().children("span").last().text().replace(/[\t\n\r]/gm,' ').trim();
              position.employmentDuration = $(this).children("section").children("div").children("div").children("a").children("div.pv-entity__summary-info").children("div.display-flex").children("h4").last().children("span").last().text().replace(/[\t\n\r]/gm,' ').trim();
              position.about = $(this).children("section").children("div").children("div").children("div").children("p").text().replace(/[\t\n\r]/gm,' ').trim();
              position.about = position.about.replace("…", "").replace("see more", "").trim();
              exp.positions.push(position);
            } else {
              exp.company = $(this).children("section").children("div").children("a").children("div").children("div.pv-entity__company-summary-info").children("h3").children("span").last().text().replace(/[\t\n\r]/gm,' ').trim();
              exp.company = exp.company.replace("Full-time", "").trim();
              exp.company = exp.company.replace("Contract", "").trim();
              exp.company = exp.company.replace("Part-time", "").trim();
              exp.duration = $(this).children("section").children("div").children("a").children("div").children("div.pv-entity__company-summary-info").children("h4").children("span").last().text().replace(/[\t\n\r]/gm,' ').trim();
              exp.positions = [];
              await $(this).children("section").children("ul").children("li").each(async function( indexB ) {
                var position = {};
                var nested = $(this).children("div").children("div").children("div").children("div").children("div").children("div");
                position.title = nested.children("h3").children("span").last().text().replace(/[\t\n\r]/gm,' ').trim();
                position.datesEmployed = nested.children("div").children("h4").first().children("span").last().text().replace(/[\t\n\r]/gm,' ').trim();
                position.employmentDuration = nested.children("div").children("h4").last().children("span").last().text().replace(/[\t\n\r]/gm,'' ).trim();
                position.about = nested.children("p").text().replace(/[\t\n\r]/gm,' ').trim();
                position.about = position.about.replace("…", "").replace("see more", "").trim();
                exp.positions.push(position);
              });
            }
            profile.experience.push(exp);
          });
        } catch(err) { null; }


        // Fill Education Section:
        try {
          await $("#education-section > ul > li").each(async function( index ) {
            var edu = {};
            edu.institution = $(this).children("div").children("div").children("a").children("div.pv-entity__summary-info").children("div.pv-entity__degree-info").children("h3").text().replace(/[\t\n\r]/gm,' ').trim();
            edu.degreeName = $(this).children("div").children("div").children("a").children("div.pv-entity__summary-info").children("div.pv-entity__degree-info").children("p.pv-entity__degree-name").children("span").last().text().replace(/[\t\n\r]/gm,' ').trim();
            edu.fieldOfStudy = $(this).children("div").children("div").children("a").children("div.pv-entity__summary-info").children("div.pv-entity__degree-info").children("p.pv-entity__fos").children("span").last().text().replace(/[\t\n\r]/gm,' ').trim();
            edu.startYear = $(this).children("div").children("div").children("a").children("div.pv-entity__summary-info").children("p.pv-entity__dates").children("span").last().children("time").first().text().replace(/[\t\n\r]/gm,' ').trim();
            edu.endYear = $(this).children("div").children("div").children("a").children("div.pv-entity__summary-info").children("p.pv-entity__dates").children("span").last().children("time").last().text().replace(/[\t\n\r]/gm,' ').trim();
            profile.education.push(edu);
          });
        } catch(err) { null; }


        // Fill Top Skills Section:
        try {
          await $("section.pv-skill-categories-section > ol > li").each(async function( index ) {
            var skill = {};
            skill.skill = $(this).children("div").children("div").children("p").children("a").children("span").text().replace(/[\t\n\r]/gm,' ').trim();
            skill.endorsements = $(this).children("div").children("div").children("a").children("span").last().text().replace(/[\t\n\r]/gm,' ').trim();
            profile.skills.push(skill);
          });
        } catch(err) { null; }


        // Fill Bottom Skills Sections:
        try {
          await $("section.pv-skill-categories-section > div > div").each(async function( index ) {
            await $(this).children("ol").children("li").each(async function( indexB ) {
              var skill = {};
              skill.skill = $(this).children("div").children("div").children("p").children("a").children("span").text().replace(/[\t\n\r]/gm,' ').trim();
              skill.endorsements = $(this).children("div").children("div").children("a").children("span").last().text().replace(/[\t\n\r]/gm,' ').trim();
              if(skill.skill) { profile.skills.push(skill); }
            });
          });
        } catch(err) { null; }


        // Fill Recommendations Section:
        try {
          await $("section.pv-recommendations-section > div > div > div.active > div > div > ul > li").each(async function( index ) {
            var rec = {};
            rec.highlights = "";
            rec.name = $(this).children("div.pv-recommendation-entity__header").children("a").children("div").children("h3").text().replace(/[\t\n\r]/gm,' ').trim();
            rec.title = $(this).children("div.pv-recommendation-entity__header").children("a").children("div").children("p").first().text().replace(/[\t\n\r]/gm,' ').trim();
            rec.relation = $(this).children("div.pv-recommendation-entity__header").children("a").children("div").children("p").last().text().replace(/[\t\n\r]/gm,' ').trim();
            $(this).children("div.pv-recommendation-entity__highlights").children("blockquote").children("div").children("span").each(async function( indexB ) {
              if(!$(this).text().includes("See more")) { 
                rec.highlights += $(this).text().replace(/[\t\n\r]/gm,' ').replace("See less", "").trim() + " ";
              }
            });
            await profile.recommendations.received.push(rec);
          });
        } catch(err) { null; }

      }
      output.push(profile);
    }
    await fsp.writeFile('./' + outputFile, JSON.stringify(output, null, 2));
    await browser.close();
  } else {
    await page.goto('https://www.linkedin.com/login');
    await page.waitFor(120000);
    cookies = await page.cookies();
    await fsp.writeFile('./cookies.json', JSON.stringify(cookies, null, 2));
  }
}


// Auto-Scroll:
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


// CSV Parser:
function parseCsv(inputString, options, cb) {
  try {
    if(!inputString || !(typeof inputString === 'string' || inputString instanceof String)){ var error = { message: "Input string not provided or not in string format" }; if(cb){ cb(error, null) };  return; }
    if(!cb || !(typeof(cb) === 'function')){ return; }
    if(!options || !options.delimiter){ var delimiter = ","; } 
    else if (options.delimiter) { var delimiter = options.delimiter; } 
    else { var delimiter = ","; }
    var lines = inputString.split("\n");
    for (var i = 0; i < lines.length; i++) { lines[i] = lines[i].split(delimiter); }
    var output = { success: true, message: "CSV String Parsed And Output Returned", output: lines }
    cb(null, output);
    return;
  } catch (err) { if(cb) { cb(err, null); }; return; }
};


// Load Input CSV, Parse and Call Main
if(inputFile) {
  fs.readFile(inputFile, 'utf8', function (err, data) {
    if (err) { return console.log(err); }
    parseCsv(data, {}, function(err, out) {
      if(err) { console.log("Error loading input file"); return; }
      else { input = out.output; }
      main();
    });
  });
} else {
  main();
}