
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
			"img_info" : "empty",
		}, null);
    return true;
});


chrome.contextMenus.onClicked.addListener((info, tab) => {
	chrome.scripting.executeScript({
		target: { tabId: tab.id },
		function: change_fig,
		args: [info.srcUrl, tab.id]
	  });
  });
  

  function change_fig(url, tabid) {
	obj={"img_info": "empty"};
	chrome.storage.local.set(obj);
	var img = new Image();
	img.src = url;
	img.onload = function() {
		var canvas = document.createElement('canvas');
    	canvas.width  = img.width;
		canvas.height = img.height;
		// Draw Image
		var ctx = canvas.getContext('2d');
		ctx.drawImage(img, 0, 0);
		// To Base64
		const img_info = canvas.toDataURL("image/png");
		chrome.storage.local.set({
			"img_info" : img_info 
		})
	};
	 
	obj={"fig_url": url};
	chrome.storage.local.set(obj);
  }