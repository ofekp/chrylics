//function DOMtoString(document_root) {
//	var html = '';
//	var node = document_root.firstChild;
//
//	while (node) {
//		switch (node) {
//			case Node.ELEMENT_NODE:
//				alert(node + ": \n\n" + node.outerHTML);
//				html += node.outerHTML;
//				break;
//			case Node.TEXT_MODE:
//				alert(node + ": \n\n" + node.nodeValue);
//				html += node.nodeValue;
//				break;
//			case Node.CDATA_SECTION_NODE:
//				alert(node + ": \n\n" + node.nodeValue);
//				html += '<![CDATA[' + node.nodeValue + ']]>';
//				break;
//			case Node.COMMENT_MODE:
//				alert(node + ": \n\n" + node.nodeValue);
//				html += '<!--' + node.nodeValue + '-->';
//				break;
//			case Node.DOCUMENT_TYPE_MODE:
//				alert(node + ": \n\n" + node.name + ", " + node.publicId + ", " + node.systemId);
//				html += "<!DOCTYPE " + node.name + (node.publicId ? ' PUBLIC "' + node.publicId + '"' : '') + (!node.publicId && node.systemId ? ' SYSTEM' : '') + (node.systemId ? ' "' + node.systemId + '"' : '') + '>\n';
//				break;
//		}
//		node = node.nextSibling;
//	}
//	
//	return html;
//}
//
//chrome.runtime.sendMessage({
//	action: "getSource",
//	source: document.documentElement.outerHTML
//});

function getCurrentSong_tunein(document_root) {
	return document_root.getElementById('mainContent').innerHTML;
}

chrome.runtime.sendMessage({
	action: "getCurrentSong_tunein",
	source: getCurrentSong_tunein(document)
});