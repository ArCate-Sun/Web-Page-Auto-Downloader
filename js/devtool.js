// console.log('Hello from -> Devtool');
// chrome.devtools.panels.create(
// 	"ResourcesSaver",
// 	"icon.gif",
// 	"html/content.html",
// 	function(panel) { 

// 	}
// );



var reportElement = document.createElement('div');
var isDownloading = false;

function saveAllResources() {
	var toDownload = [];

	// Downloading flag
	isDownloading = true;

	// Disable download notification
	chrome.downloads.setShelfEnabled(false);

	chrome.tabs.get(chrome.devtools.inspectedWindow.tabId, function (tab) {
		console.log('Save content from: ', tab.url);
		var domain = tab.url.split('://')[1].substring(0, tab.url.split('://')[1].indexOf('/'));
		//Fetching all available resources and filtering using name of script snippet added 
		chrome.devtools.inspectedWindow.getResources(function (resources) {
			// This function returns array of resources available in the current window

			var resources = resources;

			// Add Resource here
			for (i = 0; i < resources.length; i++) {
				// Make sure unique URL
				if (toDownload.findIndex(function (item) {
					return item.url === resources[i].url
				}) === -1) {
					toDownload.push(resources[i]);
				}
			}

			console.log('Combine Resource: ', resources);
			console.log('Download List: ', toDownload)

			chrome.downloads.setShelfEnabled(true);

			downloadZipFile(toDownload, allDone);

		});
	})

}



function resolveURLToPath(cUrl, cType, cContent) {
	var filepath, filename, isDataURI;
	var foundIndex = cUrl.search(/\:\/\//);
	// Check the url whether it is a link or a string of text data
	if ((foundIndex === -1) || (foundIndex >= 10)) {
		isDataURI = true;
		console.log('Data URI Detected!!!!!');

		if (cUrl.indexOf('data:') === 0) {
			var dataURIInfo = cUrl.split(';')[0].split(',')[0].substring(0, 30).replace(/[^A-Za-z0-9]/g, '.');
			// console.log('=====> ',dataURIInfo);
			filename = dataURIInfo + '.' + Math.random().toString(16).substring(2) + '.txt';
		} else {
			filename = 'data.' + Math.random().toString(16).substring(2) + '.txt';
		}

		filepath = '_DataURI/' + filename;
	} else {
		isDataURI = false;
		filepath = cUrl.split('://')[1].split('?')[0];
		if (filepath.charAt(filepath.length - 1) === '/') {
			filepath = filepath + 'index.html';
		}
		filename = filepath.substring(filepath.lastIndexOf('/') + 1);
	}

	// Get Rid of QueryString after ;
	filepath = filepath.substring(0, filepath.lastIndexOf('/') + 1) + filename.split(';')[0];

	// Add default extension to non extension filename
	if (filename.search(/\./) === -1) {
		let haveExtension = null;
		if (cType && cContent) {
			// Special Case for Images with Base64
			if (cType.indexOf('image') !== -1) {
				if (cContent.charAt(0) == '/') {
					filepath = filepath + '.jpg';
					haveExtension = 'jpg';
				}
				if (cContent.charAt(0) == 'R') {
					filepath = filepath + '.gif';
					haveExtension = 'gif';
				}
				if (cContent.charAt(0) == 'i') {
					filepath = filepath + '.png';
					haveExtension = 'png';
				}
			}
			// Stylesheet | CSS
			if (cType.indexOf('stylesheet') !== -1 || cType.indexOf('css') !== -1) {
				filepath = filepath + '.css';
				haveExtension = 'css';
			}
			// JSON
			if (cType.indexOf('json') !== -1) {
				filepath = filepath + '.json';
				haveExtension = 'json';
			}
			// Javascript
			if (cType.indexOf('javascript') !== -1) {
				filepath = filepath + '.js';
				haveExtension = 'js';
			}
			// HTML
			if (cType.indexOf('html') !== -1) {
				filepath = filepath + '.html';
				haveExtension = 'html';
			}

			if (!haveExtension) {
				filepath = filepath + '.html';
				haveExtension = 'html';
			}
		} else {
			// Add default html for text document
			filepath = filepath + '.html';
			haveExtension = 'html';
		}
		filename = filename + '.' + haveExtension;
		console.log('File without extension: ', filename, filepath);
	}

	// Remove path violation case
	filepath = filepath
		.replace(/\:|\\|\=|\*|\.$|\"|\'|\?|\~|\||\<|\>/g, '')
		.replace(/\/\//g, '/')
		.replace(/(\s|\.)\//g, '/')
		.replace(/\/(\s|\.)/g, '/');

	// Decode URI
	if (filepath.indexOf('%') !== -1) {
		try {
			filepath = decodeURIComponent(filepath);
			filename = decodeURIComponent(filename);
		} catch (err) {
			console.log(err);
		}
	}

	//  console.log('Save to: ', filepath);
	//  console.log('File name: ',filename);

	return {
		path: filepath,
		name: filename,
		dataURI: isDataURI && cUrl
	}
}

function downloadZipFile(toDownload, callback) {
	if (zip) {
		zip.workerScriptsPath = "../js/zip/";
		getAllToDownloadContent(toDownload, function (result) {
			console.log(result);
			zip.createWriter(new zip.BlobWriter(), function (blobWriter) {
				addItemsToZipWriter(blobWriter, result, downloadCompleteZip.bind(this, blobWriter, callback));
			}, function (err) {
				console.log('ERROR: ', err, currentRest);
				// Continue on Error, error might lead to corrupted zip, so might need to escape here
				callback(false);
			});
		});
	} else {
		callback(false);
	}
};

function getAllToDownloadContent(toDownload, callback) {
	// Prepare the file list for adding into zip
	var result = [];
	var pendingDownloads = toDownload.length;

	// window.toDownload = toDownload;

	toDownload.forEach(function (item, index) {
		if (item.getContent && !!!item.isStream) {
			item.getContent(function (body, encode) {
				if (chrome.runtime.lastError) {
					console.log(chrome.runtime.lastError);
				}
				// console.log(index,': ',encode,'---->',body ? body.substring(0,20) : null);
				var resolvedItem = resolveURLToPath(item.url, item.type, body);
				var newURL = resolvedItem.path;
				var filename = resolvedItem.name;
				var currentEnconding = encode || null;

				if (filename.search(/\.(png|jpg|jpeg|gif|ico|svg)/) !== -1) {
					currentEnconding = 'base64';
				}

				if (resolvedItem.dataURI) {
					currentEnconding = null;
				}

				// Make sure the file is unique, otherwise exclude
				var foundIndex = result.findIndex(function (currentItem) {
					return currentItem.url === newURL;
				});

				// Only add to result when the url is unique
				if (foundIndex === -1) {
					result.push({
						name: filename,
						type: item.type || 'text/plain',
						originalUrl: item.url,
						url: newURL,
						content: resolvedItem.dataURI || body,
						encoding: currentEnconding
					});
				}

				// Callback when all done
				pendingDownloads--;

				if (pendingDownloads === 0) {
					callback(result);
				}
			});
		} else {
			pendingDownloads--;
		}
	});
}

function addItemsToZipWriter(blobWriter, items, callback) {
	var item = items[0];
	var rest = items.slice(1);

	// 美化
	let check_beautify = false;

	// if item exist so add it to zip
	if (item) {
		// Try to beautify JS,CSS,HTML here
		if (js_beautify &&
			html_beautify &&
			css_beautify &&
			check_beautify &&
			item.name &&
			item.content
		) {
			var fileExt = item.name.match(/\.([0-9a-z]+)(?:[\?#]|$)/);
			switch (fileExt ? fileExt[1] : '') {
				case 'js': {
					console.log(item.name, ' will be beautified!');
					item.content = js_beautify(item.content);
					break;
				}
				case 'html': {
					console.log(item.name, ' will be beautified!');
					item.content = html_beautify(item.content);
					break;
				}
				case 'css': {
					console.log(item.name, ' will be beautified!');
					item.content = css_beautify(item.content);
					break;
				}
			}
		}

		// Check whether base64 encoding is valid
		if (item.encoding === 'base64') {
			// Try to decode first
			try {
				var tryAtob = atob(item.content);
			} catch (err) {
				console.log(item.url, ' is not base64 encoding, try to encode to base64.');
				try {
					item.content = btoa(item.content);
				} catch (err) {
					console.log(item.url, ' failed to encode to base64, fallback to text.');
					item.encoding = null;
				}
			}
		}

		// Create a reader of the content for zip
		var resolvedContent = (item.encoding === 'base64') ?
			new zip.Data64URIReader(item.content || '') :
			new zip.TextReader(item.content || 'No Content: ' + item.originalUrl);

		// Create a Row of Report Table
		var newList = document.createElement('ul');

		// Make sure the file has some byte otherwise no import to avoid corrupted zip
		resolvedContent.init(function () {
			if (resolvedContent.size > 0) {
				console.log(resolvedContent.size, item.encoding || 'No Encoding', item.url, item.name);
				blobWriter.add(item.url, resolvedContent,
					function () {
						// On Success, to the next item
						addItemsToZipWriter(blobWriter, rest, callback);

						// Update Report Table
						newList.className = 'each-done';
						newList.innerHTML = '<li>Added</li><li class="success">Done</li><li>' + item.url + '</li>';
						reportElement.insertBefore(newList, reportElement.childNodes[0]);
					},
					function () {
						// On Progress
					}
				);
			} else {
				// If no size, exclude the item
				console.log('EXCLUDED: ', item.url);

				// Update Report Table
				newList.className = 'each-failed';
				newList.innerHTML = '<li>Ignored</li><li class="failed">Failed</li><li>' + item.url + '</li>';
				reportElement.insertBefore(newList, reportElement.childNodes[0]);

				// To the next item
				addItemsToZipWriter(blobWriter, rest, callback);
			}
		});

	} else {
		// Callback when all done
		callback();
	}
	return rest;
}

//function downloadCompleteZip(blobWriter, callback) {
//	// Close the writer and save it by dataURI
//	blobWriter.close(function (blob) {
//		chrome.downloads.download({
//			url: URL.createObjectURL(blob),
//			filename: 'All Resources/all.zip',
//			saveAs: false
//		}, function () {
//			if (chrome.runtime.lastError) {
//				callback(false);
//			} else {
//				callback(true);
//			}
//		});
//	});
//}

function downloadCompleteZip(blobWriter, callback) {
	blobWriter.close(function (blob) {
		var url = new URL(current_url);
		var filename = url.hostname ? url.hostname.replace(/([^A-Za-z0-9\.])/g, "_") : 'all';
		var a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = filename + '.zip';
		a.click();
		callback(true)
	})
}





// var eventList = ['onBeforeNavigate', 'onCreatedNavigationTarget',
//     'onCommitted', 'onCompleted', 'onDOMContentLoaded',
//     'onErrorOccurred', 'onReferenceFragmentUpdated', 'onTabReplaced',
//     'onHistoryStateUpdated'];

// let url_task_start = false;
// chrome.tabs.onUpdated.addListener(function (changed_tab_id, change_info, tab) {
// 	if (tab_id === changed_tab_id) {
// 		alert("update: " + change_info.url);
// 	}
// })



chrome.webNavigation["onCompleted"].addListener(function (data) {
	if (data.frameId === 0) {
		// alert(data.frameId + " " + data.url)
		current_url = data.url;
		sleep(500);
		saveAllResources();
	}
});

chrome.webNavigation.onErrorOccurred.addListener(function (details) {
	if (details.error.indexOf("ERR_CONNECTION_TIMED_OUT") != -1) {
		open_next_page();
	}
})

// http://www.baiducontent.com/
// alert(0)
// var port = chrome.runtime.connect({
// 	name: 'auto_download_resources_extension'
// });
// port.postMessage({status: 'init'});
// alert(1)
// port.onMessage.addListener(function(msg) {
// 	alert(msg);
// 	// port.postMessage({question: '哦，原来是你啊！'});

// });


// port.onMessage.addListener(function(request) {
// 	if (request.type === 'init_routes') {
// 		var actions = request.actions || [];
// 		window.cyraOps.initRoute(request.routes, actions);
// 	} else if (request.type === 'switch_route') {
// 		window.cyraOps.switchRoute(request.pathObj);
// 	}
// });

function allDone(isSuccess) {
	// Default value
	if (typeof isSuccess === 'undefined') {
		isSuccess = true;
	}

	// Downloading flag
	isDownloading = false;

	// Re-enable Download notification
	chrome.downloads.setShelfEnabled(true);

	// 成功或失败
	if (isSuccess) {
		console.log("下载成功!")
		open_next_page();

	} else {
		console.err("下载失败 TAT")
	}

}

function sleep(delay) {
	var start = (new Date()).getTime();
	while ((new Date()).getTime() - start < delay) {
	  continue;
	}
  }
  


let tab_id = undefined;
chrome.tabs.query({ active: true }, function (tabs) {
	tab_id = tabs[0].id;
})

var url_idx = 0;
let current_url = undefined;
function open_next_page() {
	if (tab_id === undefined) {
		return false;
	}

	let next_url = webset_info.urls[url_idx].url;
	chrome.tabs.update(tab_id, { url: next_url }, function (tab) {
		return;
	})

	url_idx++;
	return true;
}

function find_url_idx_by_url(url) {
	let i = 0;
	while (i < webset_info.urls.length && webset_info.urls[i].url !== url) {
		i++;
	}

	if (i < webset_info.urls.length) {
		return i;
	} else {
		return 0;
	}
}

let popup_port = undefined;
chrome.runtime.onConnect.addListener(function (port) {
	if (port.name == "auto_download_resources_extension") {
		popup_port = port;
		port.onMessage.addListener(function (msg) {
			let cmd = msg.cmd;
			if (cmd === "download") {

				if (msg.from_url) {
					url_idx = find_url_idx_by_url(msg.from_url) || msg.from;
				} else {
					url_idx = msg.from;
				}

				start_download = true;
				open_next_page();
			} else if (cmd === "stop") {
				start_download = false;
			}
		})
	}
});

