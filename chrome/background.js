
chrome.runtime.onInstalled.addListener(function () {
    chrome.contextMenus.create({
	"id": "Bitjourney",
	"title": "Bitjourney : Retro graphics generator",
	"type": "normal",
	"contexts": ["image"],
    });
	chrome.storage.local.set(
		{
			"border" : 10,
			"target_color" : 16,
			"pixel_size" : 2,
			"fig_url" : "img/icon-128x128.png",
			"mesh" : 10,
		}, null);
    return true;
});


chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    sendResponse({});
});


chrome.contextMenus.onClicked.addListener((info, tab) => {
	chrome.scripting.executeScript({
		target: { tabId: tab.id },
		function: change_fig,
		args: [info.srcUrl, location.href]
	  });
  });
  
  function change_fig(url, href) {
	obj={"fig_url": url};
	chrome.storage.local.set(obj);
  }