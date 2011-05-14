function copyToClipboard(text) {
    var input = document.getElementById('clip');
    input.value = text;                 
    input.focus();
    input.select();
    document.execCommand('Copy');
}

function parseFlv(detailUrl) {
	var params = new Object();
	
	// xmlの取得
	var options = get_storage();
	res = getVideoDetail(detailUrl);
	if (res) {
		params.title = res['videoTitle0'];
		params.flv = res['videoUrl0'];
		params.filename = options.is_add_extension=='1' ? params.title+".flv" : params.title;
		params.success = true;
		params.status = 200;
	} else {
		params.success = false;
		params.status = -1;
	}
	
	return params;
}

/**
 * 関連動画を検索する
 * @param keyword
 * @param page
 */
function getMoreRecommend(keyword, page) {
	var params = new Object();
	params.keyword = keyword;
	params.page = page;
	
	var url = 'http://asg.to/search';
	jQuery.ajax({
		'async': false
		,'type': 'GET'
		,'url': url
		,'data': {'q':keyword, 'page':page}
		,'dataType': 'html'
		,'success': function(html) {
			params.success = true;
			params.movies = new Array();
			params.html = html || "";
		}
		,'error': function(request, status, thrown) {
			params.success = false;
			params.status = status;
		}
	});
	
	return params;
}

chrome.extension.onRequest.addListener(function(request, sender, func)  {
	switch (request.type) {
		case "storage":
			func(get_storage());
			break;
		case "clip":
			copyToClipboard(request.text);
			func();
			break;
		case "parse":
			var params = parseFlv(request.url);
			func(params);
			break;
		case "more":
			var params = getMoreRecommend(request.keyword, request.page);
			func(params);
			break;
	}
});
