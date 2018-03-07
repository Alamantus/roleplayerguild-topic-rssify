const express = require('express');
const fs = require('fs');
const request = require('request');
const cheerio = require('cheerio');

const app = express();

function formatItem ($, element) {
  const author = $(element).find('.user-uname').text();
  const date = $(element).find('.ago').attr('title');
  const link = $(element).find('.post-permalink').attr('href');
  const description = $(element).find('.post-content').text();
  return '\t\t\t<item>\n'
      + '\t\t\t\t<author>' + (author.length > 0 ? author : '0th Post') + '</author>\n'
      + '\t\t\t\t<date>' + date + '</date>\n'
      + '\t\t\t\t<description>' + description + '</description>\n'
      + '\t\t\t\t<link>https://www.roleplayerguild.com' + link + '</link>\n'
    + '\t\t\t</item>\n';
}

app.get('/', function(req, res) {
  const url = req.query['url'];

  request(url, function(error, response, html) {
    if (error) {
      console.error(error);
    } else {
      const $ = cheerio.load(html);

      let items = '';

      $('.post').each(function (index, element) {
        items.push(formatItem($, element));
      });

      const pagination = $('.pager');

      const promises = [];

      if (pagination) {
        const lastUrl = $(pagination).children().last().children().first().attr('href');
        const pageQueryString = '?page=';
        const pageQueryStringIndex = lastUrl.indexOf(pageQueryString);
        const pages = lastUrl.substr(pageQueryStringIndex + pageQueryString.length);

        if (pages && parseInt(pages) > 1) {
          const numberOfPages = parseInt(pages);

          for (let i = 2; i <= numberOfPages; i++) {
            const promise = new Promise(function(resolve, reject) {
              const pageUrl = url + '?page=' + i.toString();
              request(pageUrl, function(err, r, resHtml) {
                if (err) {
                  console.error(err);
                  reject();
                } else {
                  const $page = cheerio.load(resHtml);
                  $page('.post').each(function (index, element) {
                    items.push(formatItem($page, element));
                  });

                  resolve(pageUrl);
                }
              });
            });
            promises.push(promise);
          }
        }
      } else {
        promises.push(Promise.resolve());
      }

      Promise.all(promises).then(function(urls) {
        console.log(urls);
        res.set('Content-Type', 'text/xml');
        res.send('<?xml version="1.0" encoding="UTF-8" ?>\n'
          + '\t<rss version="2.0">\n'
            + '\t\t<channel>\n'
              + '\t\t\t<title>OOC</title>\n'
              + '\t\t\t<link>' + url + '</link>\n'
              + '\t\t\t<description>The OOC posts</description>\n'
              + items.join('\n') + '\n'
            + '\t\t</channel>\n'
          + '\t</rss>\n');
      });
    }
  });
});

app.listen('3014');

console.log('Listining on port 3014');

exports = module.exports = app;