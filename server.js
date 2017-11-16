const request 	= require("request");
const http 		= require("http");
const cheerio   = require("cheerio");
const fs        = require("fs");
const needle    = require('needle');

//Настройки куков (обязательно)
const options = {
    headers: {
        'X-Requested-With': 'XMLHttpRequest'
    },
    //Куки
    cookies: {
    	'asian_server': '',
    }
};

let allLink = [];
let downloadLinkArr = [];

//Получение кол-ва страниц по всем тегам
function getCountPageByTags(url) {
  return new Promise(function (resolve, reject) {
    needle.get(url, options, function (error, res, body) {
      if (!error && res.statusCode == 200) {
      	let $ = cheerio.load(body);
      	let countPage = void 0;
	    $(".disable_on_small").each(function() {
			let count = $(this).text();
			if (isNaN(parseInt(count))) {
				countPage = parseInt($("p.numeric_pages").text());
			} else if (!isNaN(parseInt(count))) {
				countPage = parseInt(count);
			}
		});
        resolve(countPage);
      } else {
        reject(error);
      }
    });
  });
}

//Получение ссылок по тегам
function getPageByTags(count, tag) {
	return new Promise(function (resolve, reject) {
		let arr = [];
		if (count >= 0) { 
			needle.get(`https://anime-pictures.net/pictures/view_posts/${count}?search_tag=${tag}&order_by=date&ldate=0&lang=ru`, options , 
			function(error, response, body) {
			  let $ = cheerio.load(body);
			  $(".img_block_big > a").each(function() {
				let link = $(this);
				let text = link.text();
				let href = link.attr("href");
				arr.push(href);
			  });
			  resolve(arr);
			});
		} else{
			reject('Error');
		}		

	})
}

//Создание URI строки тегов
function getTags(tag) {
	let arr = [];
	let strTag = '';
	if (Array.isArray(tag)) {
		if (tag.length >= 2) {
			let arr = Array.prototype.slice.call(tag);
			for (let i = 0; i < arr.length; i++) {
				if (i == arr.length - 1) {
					strTag += encodeURI(arr[i]);
				} else {
					strTag += encodeURI(arr[i]) + "%26%26";
				}
			}
		} else {
			strTag = encodeURI(tag[0]);
		}
	}
	return strTag;
}

//Получение ссылки для каждой картинки
function openLinkImage(arr) {
	let linkArr = [];
	let url = 'https://anime-pictures.net/';
	for (let i in arr) {
		for (let val of arr[i]) {
			linkArr.push(url + val);
		}
	}
	return linkArr;

}

//Получение ссылки для скачивания
function getDownloadLink(url) {
	return new Promise(function (resolve, reject) {
		needle.get(url, options , 
		function(error, response, body) {
		  let downloadLink = '';
	      if (!error && response.statusCode == 200) {
			  let $ = cheerio.load(body);
			  $("a.download_icon").each(function() {
				let link = $(this);
				let text = link.text();
				let href = link.attr("href");
				downloadLink = href;
			  });
			  resolve(downloadLink);
			} else {
				reject('Error');
			}
		});
	})
}

function downloadImage(url) {
  let httpURL = 'http://anime-pictures.net' + url;
  let name = httpURL.split('/');
  let imgName = name[name.length - 1];
  return new Promise(function (resolve, reject) {
    needle.get(httpURL, options, function (error, res, body) {
      if (!error && res.statusCode == 200) {
      	http.get(httpURL, function(response) {
		  response.pipe(fs.createWriteStream(`./image/${imgName}`));
		});
        resolve();
      } else {
        reject(error);
      }
    });
  });
}

async function main(tag) {
	if (Array.isArray(tag) && tag.length > 0) {
		let strTag = getTags(tag);
		let url = `https://anime-pictures.net/pictures/view_posts/0?search_tag=${strTag}&order_by=date&ldate=0&lang=ru`;
		let countByTag = await getCountPageByTags(url);
		for (let i = 0; i <= countByTag; i++) {
			allLink.push(await getPageByTags(i, strTag));
		}
		let getImageLink = await openLinkImage(allLink);
		
		for (let val of getImageLink) {
			downloadLinkArr.push(await getDownloadLink(val));
		}
		for (let val of downloadLinkArr) {
			await downloadImage(val);
		}
	} 
	else if (!Array.isArray(tag)){
		console.log('Выберите теги');
	}
}

//Массив тегов ['tag', 'tag1'];
main(['небо', 'без людей']);
