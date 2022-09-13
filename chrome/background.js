
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
			"target_color" : 8,
			"pixel_size" : 4,
			"fig_url" : "img/example.png",
			"mesh" : 10,
		}, null);
    return true;
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