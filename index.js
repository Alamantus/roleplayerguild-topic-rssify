const express = require('express');
const fs = require('fs');
const request = require('request');
const cheerio = require('cheerio');
const escape = require('escape-html');

const app = express();

function formatItem ($, element) {
  const author = $(element).find('.user-uname').text();
  const date = $(element).find('.ago').attr('title');
  const link = $(element).find('.post-permalink').attr('href');
  const description = $(element).find('.post-content').text();
  return '\t\t\t<item>\n'
      + '\t\t\t\t<author>' + (author.length > 0 ? author : '0th Post') + '</author>\n'
      + '\t\t\t\t<date>' + date + '</date>\n'
      + '\t\t\t\t<description>' + escape(description) + '</description>\n'
      + '\t\t\t\t<link>https://www.roleplayerguild.com' + link + '</link>\n'
    + '\t\t\t</item>\n';
}

app.get('/', function(req, res) {
  const maxPosts = 10;
  const url = req.query['url'];

  if (!url) {
    res.send('Enter the URL like this: https://roleplayerguild-topic-rssify.herokuapp.com/?url=[your roleplayerguild topic url]');
  } else {
    request(url, function(error, response, html) {
      if (error) {
        console.error(error);
      } else {
        const $ = cheerio.load(html);

        const title = $('.topic-heading').first().text().trim();

        let items = [];

        const promises = [];

        const pagination = $('.pager');

        if (pagination) {
          const lastUrl = $(pagination).children().last().children().first().attr('href');
          const pageQueryString = '?page=';
          const pageQueryStringIndex = lastUrl.indexOf(pageQueryString);
          const pages = lastUrl.substr(pageQueryStringIndex + pageQueryString.length);

          if (pages && parseInt(pages) > 1) {
            const numberOfPages = parseInt(pages);

            const promise = new Promise(function(resolve, reject) {
              let postsOnPage = [];
              const pageUrl = url + '?page=' + pages;
              request(pageUrl, function(err, r, resHtml) {
                if (err) {
                  console.error(err);
                  reject();
                } else {
                  const $page = cheerio.load(resHtml);
                  $page('.post').each(function (index, element) {
                    postsOnPage.push(formatItem($page, element));
                  });

                  if (postsOnPage.length < maxPosts) {
                    request(url + '?page=' + (numberOfPages - 1), function(err, r, resHtml) {
                      const nextPage = [];
                      $page('.post').each(function (index, element) {
                        nextPage.push(formatItem($page, element));
                      });
                      postsOnPage = nextPage.concat(postsOnPage).reverse();

                      for (let j = 0; j < maxPosts; j++) {
                        items.push(postsOnPage[j]);
                      }
                      resolve();
                    });
                  } else {
                    postsOnPage = postsOnPage.reverse();
                    for (let j = 0; j < maxPosts; j++) {
                      items.push(postsOnPage[j]);
                    }

                    resolve();
                  }
                }
              });
            });
            promises.push(promise);
          }
        } else {
          let postsOnPage = [];
          $('.post').each(function (index, element) {
            postsOnPage.push(formatItem($, element));
          });

          for (let i = 0; i < maxPosts; i++) {
            if (postsOnPage[i]) {
              items.push(postsOnPage[i]);
            }
          }

          promises.push(Promise.resolve());
        }

        Promise.all(promises).then(function() {
          res.set('Content-Type', 'text/xml');
          res.send('<?xml version="1.0" encoding="UTF-8" ?>\n'
            + '\t<rss version="2.0">\n'
              + '\t\t<channel>\n'
                + '\t\t\t<title>' + escape(title) + '</title>\n'
                + '\t\t\t<link>' + url + '</link>\n'
                + '\t\t\t<description>The last ' + maxPosts + ' posts in ' + escape(title) + '</description>\n'
                + '\t\t\t<total>' + items.length + '</total>\n'
                + items.join('\n') + '\n'
              + '\t\t</channel>\n'
            + '\t</rss>\n');
        });
      }
    });
  }
});

app.get('/all', function(req, res) {
  const url = req.query['url'];

  request(url, function(error, response, html) {
    if (error) {
      console.error(error);
    } else {
      const $ = cheerio.load(html);

      const items = [];

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

                  resolve();
                }
              });
            });
            promises.push(promise);
          }
        }
      } else {
        promises.push(Promise.resolve());
      }

      Promise.all(promises).then(function() {
        res.set('Content-Type', 'text/xml');
        res.send('<?xml version="1.0" encoding="UTF-8" ?>\n'
          + '\t<rss version="2.0">\n'
            + '\t\t<channel>\n'
              + '\t\t\t<title>' + escape(title) + '</title>\n'
              + '\t\t\t<link>' + url + '</link>\n'
              + '\t\t\t<description>All posts in ' + escape(title) + '</description>\n'
              + '\t\t\t<total>' + items.length + '</total>\n'
              + items.reverse().join('\n') + '\n'
            + '\t\t</channel>\n'
          + '\t</rss>\n');
      });
    }
  });
});

const port = process.env.hasOwnProperty('PORT') ? process.env.PORT : '5000';
app.listen(port);

console.log('Listining on port ' + port);

exports = module.exports = app;