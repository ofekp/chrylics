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
    var tab = tabs[0];

    // A tab is a plain object that provides information about the tab.
    // See https://developer.chrome.com/extensions/tabs#type-Tab
    var title = tab.title;

    // tab.url is only available if the "activeTab" permission is declared.
    // If you want to see the URL of other tabs (e.g. after removing active:true
    // from |queryInfo|), then the "tabs" permission is required to see their
    // "url" properties.
    console.assert(typeof title == 'string', 'tab.url should be a string');

    callback(title);
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

/**
 * @param {string} searchTerm - Search term for Google Image search.
 * @param {function(string,number,number)} callback - Called when an image has
 *   been found. The callback gets the URL, width and height of the image.
 * @param {function(string)} errorCallback - Called when the image is not found.
 *   The callback gets a string that describes the failure reason.
 */
function getLyrics(songTitle, callback, errorCallback) {
  // Google image search - 100 searches per day.
  // https://developers.google.com/image-search/
  
  var searchTerm = songTitle + " azlyrics";
  var searchUrl = 'https://ajax.googleapis.com/ajax/services/search/web' +
    '?v=1.0&q=' + encodeURIComponent(searchTerm);
  var x = new XMLHttpRequest();
  x.open('GET', searchUrl);
  // The Google image search API responds with JSON, so let Chrome parse it.
  x.responseType = 'json';
  x.onload = function() {
    // Parse and process the response from Google Image Search.
    var response = x.response;
    if (!response || !response.responseData || !response.responseData.results ||
        response.responseData.results.length === 0)
	{
		errorCallback('No response from Google search!');
		return;
    }
	var i;
    var currUrl = "";
	var lyricsUrl = "";
	// Google always returns the results in chunks of 4 urls per GET query
	var len = Math.min(4, response.responseData.results.length);
	for (i = 0; i < len; i++) {
		currUrl = response.responseData.results[i].url;
		if (currUrl.indexOf("azlyrics.com") != -1) {
			lyricsUrl = currUrl;
			break;
		}
	}
	if (lyricsUrl == "") {
		errorCallback('Could not find lyrics for song.');
		return;
	}
	  
	var request = new XMLHttpRequest();
	request.open("GET", lyricsUrl, true);
	
	request.onreadystatechange = function() {
	  if (request.readyState == 4 && request.status == 200)
		var pageHtml = request.responseText;
		var startIndex = pageHtml.indexOf("Sorry about that. -->") + "Sorry about that. -->".length;
		var endIndex = pageHtml.indexOf("</div>", startIndex);
		var lyricsHtml = pageHtml.substring(startIndex, endIndex);
		callback(lyricsHtml);
	};
	request.onerror = function() {
      errorCallback('Lyrics site error.');
	}
	request.send();
	
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
}

function renderStatus(statusText) {
  document.getElementById('status').innerHTML = statusText;
}

document.addEventListener('DOMContentLoaded', function() {
  getCurrentTabUrl(function(title) {
    // Put the image URL in Google search.
	var songTitle = title.replace(" - YouTube", "");
	var songTitle = songTitle.replace("YouTube", "");
	var songTitle = songTitle.replace("Youtube", "");
	var songTitle = songTitle.replace("youtube", "");
	var songTitle = songTitle.replace("[Music Video]", "");
	var songTitle = songTitle.replace("Music Video", "");
	var songTitle = songTitle.replace("lyrics", "");
	var songTitle = songTitle.replace("Lyrics", "");
    renderStatus('Searching for lyrics for ' + songTitle + "...");

    getLyrics(songTitle, function(lyricsHtml) {
      renderStatus(songTitle + "<br><br>");
      var lyricsResult = document.getElementById('lyrics-result');
      // Explicitly set the width/height to minimize the number of reflows. For
      // a single image, this does not matter, but if you're going to embed
      // multiple external images in your page, then the absence of width/height
      // attributes causes the popup to resize multiple times.
	  lyricsResult.innerHTML = lyricsHtml;
      lyricsResult.hidden = false;

    }, function(errorMessage) {
      renderStatus('Cannot display lyrics. ' + errorMessage);
    });
  });
});
