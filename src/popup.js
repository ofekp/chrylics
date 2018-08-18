// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Get the current URL.
 *
 * @param {function(string)} callback - called when the URL of the current tab
 *   is found.
 */
function getCurrentTabUrl(callback) {
  // Query filter to be passed to chrome.tabs.query - see
  // https://developer.chrome.com/extensions/tabs#method-query
  var queryInfo = {
    active: true,
    currentWindow: true
  };

  chrome.tabs.query(queryInfo, function(tabs) {
    // chrome.tabs.query invokes the callback with a list of tabs that match the
    // query. When the popup is opened, there is certainly a window and at least
    // one tab, so we can safely assume that |tabs| is a non-empty array.
    // A window can only have one active tab at a time, so the array consists of
    // exactly one tab.
	
	// tab.url is only available if the "activeTab" permission is declared.
    // If you want to see the URL of other tabs (e.g. after removing active:true
    // from |queryInfo|), then the "tabs" permission is required to see their
    // "url" properties.
	
	// A tab is a plain object that provides information about the tab.
    // See https://developer.chrome.com/extensions/tabs#type-Tab
    var tab = tabs[0];
	
	var songTitle;
	if (tab.url.indexOf("youtube.com") > -1) {
		songTitle = getYouTubeSong(tab);
		console.assert(typeof songTitle == 'string', 'Could not find a song name');
		callback(songTitle);
	} else if (tab.url.indexOf("tunein.com") > -1) {
		songTitle = getTuneInSong(tab);
		// Lyrics will be shown by listener instead of the supplied callback
	} else {
		getSelectedText(showSupportedSites);
	}    
  });

  // Most methods of the Chrome extension APIs are asynchronous. This means that
  // you CANNOT do something like this:
  //
  // var url;
  // chrome.tabs.query(queryInfo, function(tabs) {
  //   url = tabs[0].url;
  // });
  // alert(url); // Shows "undefined", because chrome.tabs.query is async.
}

var selectedText = "";
function getSelectedText(errorFunc) {
	chrome.tabs.executeScript( {
	    code: "window.getSelection().toString();"
	}, function(selection) {
	    selectedText = selection[0];
	    selectedText = selectedText.trim();
	    if (selectedText.length == 0) {
		    errorFunc();
			return;
	    }
		songTitle = selectedText;
		console.assert(typeof songTitle == 'string', 'Could not find a song name');
		getLyricsWrapper(songTitle);
	});
}

function getYouTubeSong(tab) {
	// Current played YouTube song is presented in the tab's title
	var title = tab.title;
    var songTitle = title.replace(" - YouTube", "");
	songTitle = songTitle.replace("YouTube", "");
	songTitle = songTitle.replace("Youtube", "");
	songTitle = songTitle.replace("youtube", "");
	songTitle = songTitle.replace("[Music Video]", "");
	songTitle = songTitle.replace("Music Video", "");
	songTitle = songTitle.replace("lyrics", "");
	songTitle = songTitle.replace("Lyrics", "");
	songTitle = songTitle.replace("(Official Video)", "");
	songTitle = songTitle.replace("(OFFICIAL VIDEO)", "");
	songTitle = songTitle.replace("(official video)", "");
	songTitle = songTitle.replace("[Official Video]", "");
	songTitle = songTitle.replace("[OFFICIAL VIDEO]", "");
	songTitle = songTitle.replace("[official video]", "");
	songTitle = songTitle.split("\"").join("");
	songTitle = songTitle.trim();
	// remove notifications number from the title
	var notification_pattern = /(\(\d*\))(.*)/i;
	var match = notification_pattern.exec(songTitle);
	if (match != null) {
	    songTitle = match[2]
	}
	songTitle = songTitle.trim();
	console.log("song title [" + songTitle + "]")
	return songTitle;
}

chrome.runtime.onMessage.addListener(function(request, sender) {
	if (request.action == "getCurrentSong_tunein") {
		var searchStr = "class=\"title\">";
		var songTitle = request.source;
		var startIndex = songTitle.indexOf(searchStr) + searchStr.length;
		var endIndex = songTitle.indexOf("</", startIndex);
		songTitle = songTitle.substring(startIndex, endIndex);
		if (songTitle != "Live")
			getLyricsWrapper(songTitle);
		else
			renderStatus("No current song information available");
	}
});

function getTuneInSong() {
	// Inject a script in tunein that will send the page's HTML to this script
	// The sent HTML source will be caught by the added listener
    chrome.tabs.executeScript(null, {file: "getPageHtml.js"}, function() {
	    if (chrome.runtime.lastError) {
		    alert("There was a problem with the script : \n" + chrome.runtime.lastError.messgae);
	    }
    });
}

function showSupportedSites() {
	renderStatus("No played song was found.");
	var lyricsResult = document.getElementById('lyrics-result');
	var htmlStr = "<br>Current supported sites:<br><img src=\"youtube.png\" title=\"Youtube\" width=100 height=100><img src=\"tunein.png\" title=\"TuneIn Radio\" width=100 height=100>"
	lyricsResult.innerHTML = htmlStr;
	lyricsResult.hidden = false;
}

function getLyricsWrapper(songTitle) {
	// Put the image URL in Google search.
	renderStatus('Searching for lyrics for ' + songTitle + "...");
	
	getLyrics(songTitle, function(bandNameRes, songNameRes, lyricsRes) {
		renderStatus("");
		var azlyrics = document.getElementById('azlyrics');
		var bandName = document.getElementById('bandName');
		var songName = document.getElementById('songName');
		var searchString = document.getElementById('searchString');
		var lyricsResult = document.getElementById('lyrics-result');
		// Explicitly set the width/height to minimize the number of reflows. For
		// a single image, this does not matter, but if you're going to embed
		// multiple external images in your page, then the absence of width/height
		// attributes causes the popup to resize multiple times.
		bandName.innerHTML = "<b>" + bandNameRes + "</b>";
		songName.innerHTML = "<b>" + songNameRes + "</b>";
		searchString.innerHTML = "Searched for: \"" + songTitle + "\"<br><br>";
		lyricsResult.innerHTML = lyricsRes;
		
		bandName.hidden = false;
		songName.hidden = false;
		searchString.hidden = false;
		lyricsResult.hidden = false;
		azlyrics.hidden = false;
	
	}, function(errorMessage) {
		renderStatus('Cannot display lyrics. ' + errorMessage);
	});
}

function parseLyricsFromLink(lyricsUrl, callback) {
	var request = new XMLHttpRequest();
	request.open("GET", lyricsUrl, true);
	
	request.onreadystatechange = function() {
	  if (request.readyState == 4 && request.status == 200) {
		var pageHtml = request.responseText;
		var startIndex = pageHtml.indexOf("<div class=\"lyricsh\">") + "<div class=\"lyricsh\">".length;
		startIndex = pageHtml.indexOf("<b>", startIndex) + "<b>".length;
		var endIndex = pageHtml.indexOf("</b>", startIndex);
		var bandName = pageHtml.substring(startIndex, endIndex); // Band name
		
		startIndex = pageHtml.indexOf("<b>", endIndex) + "<b>".length;
		endIndex = pageHtml.indexOf("</b>", startIndex);
		var songName = pageHtml.substring(startIndex, endIndex); // Song name
		
		startIndex = pageHtml.indexOf("Sorry about that. -->", startIndex) + "Sorry about that. -->".length;
		endIndex = pageHtml.indexOf("</div>", startIndex);
		var lyricsHtml = pageHtml.substring(startIndex, endIndex); // Lyrics
		
		callback(bandName, songName, lyricsHtml);
	  }
	};
	request.onerror = function() {
      errorCallback('Lyrics site error.');
	}
	request.send();
}

/**
 * @param {string} searchTerm - Search term for Google Image search.
 * @param {function(string,number,number)} callback - Called when an image has
 *   been found. The callback gets the URL, width and height of the image.
 * @param {function(string)} errorCallback - Called when the image is not found.
 *   The callback gets a string that describes the failure reason.
 */
function getLyrics(songTitle, callback, errorCallback) {
	// Create a custom search (www.azlyrics.com/*) in https://cse.google.com/cse/all
	// Then enable Custom Search API in Google dev console - https://console.developers.google.com/apis/library?project=sounddrive-9909
	// create (JavaScript) credentials in the console (with no limit on referrer)
	// click "What credentials do I need"
	// Choose app name "Chrylics"
	// Copy the credentials, click Done, the key will be provided in the query parameter 'key'
	// using the RESTful API: https://developers.google.com/custom-search/json-api/v1/using_rest
	// cx is in the form of 'cx=00255077836266642015:u-scht7a-8i' and can be retrieved from 
	// https://cse.google.com/cse/all when clicking on the "public link" belonging to the
	// required custom search engine
	var searchUrl = 'https://www.googleapis.com/customsearch/v1' +
				  '?key=AIzaSyC9xocJg-YBYJA4nVaeQBNBJYjbIjL_V-E' + 
				  '&cx=005791297897261852932:jvttnafuv6e' + 
				  '&q=' + encodeURIComponent(songTitle) +
				  '&num=1';
				 
	console.log(searchUrl)
	
	chrome.storage.local.get(searchUrl, function(items) {
		if (Object.keys(items).length !== 0) {
			var lyricsUrl = items[searchUrl];
			parseLyricsFromLink(lyricsUrl, callback);
			return;
		}
	
		var x = new XMLHttpRequest();
		x.open('GET', searchUrl);
		x.onload = function() {
		var response = x.response;
		response = JSON.parse(response);
		if (response === undefined || response.items === undefined || response.items.length === 0) {
			errorCallback('No response from Google search!');
			return;
		}

		// Get the first URL result
		var lyricsUrl = response.items[0].link;
		if (lyricsUrl === undefined) {
			errorCallback('Could not find lyrics for song.');
			return;
		}

		var cache_obj = {}
		cache_obj[searchUrl] = lyricsUrl;
		chrome.storage.local.set(cache_obj, function() {
			  // Notify that we saved.
			  console.log(cache_obj);
		});
		  
		parseLyricsFromLink(lyricsUrl, callback);

		//var width = parseInt(firstResult.tbWidth);
		//var height = parseInt(firstResult.tbHeight);
		//console.assert(
		//    typeof lyricsUrl == 'string',
		//    'Unexpected respose from the Google Image Search API!');
		};
		x.onerror = function() {
			errorCallback('Network error.');
		};
		x.send();
	});
}

function renderStatus(statusText) {
	var statusDom = document.getElementById('status');
	if (statusText.length == 0)
		statusDom.hidden = true;
	else
		statusDom.innerHTML = statusText;
}

document.addEventListener('DOMContentLoaded', function() {
	// For this to work the link must include the prefix 'http://'
	var links = document.getElementsByTagName("a");
	for (var i = 0; i < links.length; i++) {
		(function () {
			var ln = links[i];
			var location = ln.href;
			
			ln.onclick = function () {
				chrome.tabs.create({active: true, url: location});
			};
		})();
	}
	
	getCurrentTabUrl(getLyricsWrapper);
});
