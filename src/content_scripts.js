var G_RE = new RegExp("");
G_RE.compile("^(https?:\/\/asg\.to)?\/contentsPage\.html[?]mcd=[0-9|a-z|A-Z]+$");
var G_OPTIONS;

// ダウンロード処理を行う
function doDownload(event) {
	chrome.extension.sendRequest({"type": "parse", "url":event.data.url}, function(response) {
		var params = response;
		if (params.success) {
			if (G_OPTIONS.is_copy_clipboard=='1') {
				chrome.extension.sendRequest({"type": "clip", "text":G_OPTIONS.filename_prefix+params.filename}, function() {});
			}
			fowardUrl(params.flv);
		} else {
		}
	});
}

// おすすめ動画ダイアログの作成・表示を行う
function doRecommendDialog(event) {
	var $win = $(document.createElement('div'));
	var pos = $(this).position();
	var $dialog = $win.dialog({
		'title':'動画情報取得中...'
		,'autoOpen':false
		,'position':['left','top']
		,'width':'450px'
		,'zIndex':'3999'
		,'buttons':{'もっと見る':function(){
			var $self = $(this);
			var page = $dialog.attr('page');
			if (page == undefined) {
				page = 1;
				$dialog.attr('page', page);
			}
			var keyword = $dialog.attr('movie-title');
			// 検索
			processAttachRecMovieList($dialog, keyword, page);
		}}
	});
	$dialog.html('<div class="results"></div>');
	$dialog.dialog('open');
	
	chrome.extension.sendRequest({"type": "parse", "url":event.data.url}, function(response) {
		var params = response;
		if (params.success) {
			window.console.log('parse success.');
			$dialog.dialog( "option", "title", '【'+params.title+'】の関連動画' );
			$dialog.attr('movie-title', params.title);
			$dialog.attr('page', 1);
			processAttachRecMovieList($dialog, params.title, 1);
		} else {
			// 取得失敗
			window.console.log('parse failed.');
			$dialog.html('動画情報の取得に失敗しました。');
		}
	});
}

function generateRecommendKeyword(keyword) {
	keyword = keyword.replace(/〜?\(?【?(前編|後編)】?\)?〜?/g, " ");
	keyword = keyword.replace(/〜?\(?【?(前半|後半)】?\)?〜?/g, " ");
	
	keyword = keyword.replace(/〜?その[零壱弐参四伍陸漆捌玖]+〜?/g, " ");
	keyword = keyword.replace(/〜?その[零一二三四五六七八九]+〜?/g, " ");
	keyword = keyword.replace(/〜?その[0-9]+〜?/g, " ");
	
	keyword = keyword.replace(/\([零壱弐参四伍陸漆捌玖]+\)/g, " ");
	keyword = keyword.replace(/\([零一二三四五六七八九]+\)/g, " ");
	keyword = keyword.replace(/\([0-9]+\)/g, " ");
	
	keyword = keyword.replace(/[零壱弐参四伍陸漆捌玖]+/g, " ");
	keyword = keyword.replace(/[零一二三四五六七八九]+/g, " ");
	keyword = keyword.replace(/[0-9]+/g, " ");
	return keyword;
}

function calcElapsedDays(publicTime) {
	var now = new Date();
	
	var year = "20" + publicTime.substring(0,2);
	var month = publicTime.substring(3,5);
	var day = publicTime.substring(6,8);
	var uploadDate = new Date(year+"/"+month+"/"+day+' '+now.getHours()+':'+now.getMinutes()+':'+now.getSeconds());
	var days = Math.floor( ( now.getTime() - uploadDate.getTime() ) / ( 24*60*60*1000 ) ) || 0;
	return days;
}

function processAttachRecMovieList($dialog, keyword, page) {
	window.console.log('keyword='+keyword);
	keyword = generateRecommendKeyword(keyword);
	window.console.log('recommend keyword='+keyword);
	window.console.log('page='+page);
	
	if ($dialog.find('.results p.searching').size()==0) {
		$dialog.find('.results').append('<p class="searching">検索中...</p>');
	}
	$dialog.find('.results p.agh_dialog_notfound').remove();
	
	chrome.extension.sendRequest({"type": "more", "keyword":keyword, "page":page}, function(response) {
		$dialog.find('.results p.searching').remove();
		
		var params = response;
		if (params.success) {
			window.console.log('more success.');
			var html = formatHtml(params.html);
			window.console.log('formated html.length='+html.length);
			$tmpDom = $(html);
			var appendCount = 0;
			$tmpDom.find("div.internal-movie").each(function(){
				var $self = $(this);
				var $img = $self.find('img.shift-left').first();
				var title = $img.attr('alt');
				var url = $img.parent('a').attr('href');
				var $info = $self.children('div.list-info').first();
				var publicTime = $info.children('p').first().text();
				publicTime = publicTime.substring(0,14);
				var elapsedDays = calcElapsedDays(publicTime);
				console.log("elapsedDays: %s", elapsedDays);
				var elapsedDom = elapsedDays>=100 ? '<span class="elapsed">100日以上経過</span>' : '';
				
				window.console.log('movie: publicTime='+publicTime+', title='+title+', url='+url);
				var $movie = $('<div class="agh_dialog_movie"></div>');
				$movie.append('<img src="'+$img.attr('src')+'" align="left" width="70" height="70"/><a href="'+url+'" target="_blank" class="agh_dialog_link">'+title+'</a> ('+publicTime+')'+'<br/>')
					.append(createDlElement(url)).append(elapsedDom + '<br clear="all"/>');
				$dialog.find('.results').append($movie);
				appendCount++;
			});
			if (appendCount>0) {
				var page = params.page + 1;
				$dialog.attr('page', page);
			} else {
				if ($dialog.find('.results div.agh_dialog_movie').size()==0) {
					$dialog.find('.results').html('<p class="agh_dialog_notfound">関連動画が見つかりませんでした。</p>');
				} else {
					$dialog.find('.results p.agh_dialog_notfound').remove();
					$dialog.find('.results').append('<p class="agh_dialog_notfound">関連動画が見つかりませんでした。</p>');
				}
			}
		} else {
			window.console.log('more failed.');
			$dialog.html('動画情報の取得に失敗しました。');
		}
	});
}

function formatHtml(html) {
	var startIndex = html.indexOf('<body>')+'<body>'.length-1;
	var endIndex = html.indexOf('</body>');
	html = html.substring(startIndex, endIndex);
	
	html = removeScriptTag(html);
	return html;
}
function removeScriptTag(html) {
	while (true) {
		var startIndex = html.indexOf('<script');
		var endIndex = html.indexOf('</script>', startIndex);
		window.console.log('removeScriptTag: startIndex='+startIndex+', endIndex='+endIndex);
		if (startIndex < 0) {
			break;
		}
		endIndex = endIndex + '</script>'.length;
		html = html.replace(html.substring(startIndex, endIndex), '');
		window.console.log('html.length='+html.length);
	}
	return html;
}

// URLに遷移する。
function fowardUrl(url) {
	// キャッシュ解決のため、ハッシュコードをURLに追加
	var now = new Date();
	var hash = "adh_hash=" + now.getTime() + now.getMilliseconds(); 
	url += url.indexOf('?') == -1 ? '?' : '&';
	window.location.href = url + hash;
}

function getUrl(url) {
	if (url.indexOf("http://asg.to")==0) {
		return url;
	} else {
		return "http://asg.to"+url;
	}
}

function createAghElement(url) {
	var el = createDlElement(url);
	$(el).append(createRecommendElement(url));
	return el;
}

function createDlElement(url) {
	var spanEl = document.createElement('span');
	var aEl = document.createElement('a');
	$(spanEl).addClass("adh_download");
	$(aEl).attr('href', 'javascript:void(0)');
	$(aEl).bind('click.doDownload', {"url":getUrl(url)}, doDownload);
	$(aEl).append("動画DL");
	$(spanEl).append("【").append(aEl).append("】");
	return spanEl;
}

function createRecommendElement(url) {
	var spanEl = document.createElement('span');
	var aEl = document.createElement('a');
	$(spanEl).addClass("adh_recommend");
	$(aEl).attr('href', 'javascript:void(0)');
	$(aEl).bind('click.doRecommendDialog', {"url":getUrl(url)}, doRecommendDialog);
	$(aEl).append("関連動画");
	$(spanEl).append("【").append(aEl).append("】");
	return spanEl;
}

function attachAghElements(rootNode) {
	if (window.location.href.match(G_RE)) {
		$("#movie_info",rootNode).prepend(createAghElement(window.location.href));
		
		$("#nextback",rootNode).find("a").each(function() {
			var url = $(this).attr('href');
			// 動画詳細ページへのリンクかつ、imgタグに対するリンクではない場合
			if (url.match(G_RE)) {
				$(this).after(createAghElement(url));
			}
		});
		
		$("#recommended_in_category",rootNode).find("a").each(function() {
			var url = $(this).attr('href');
			// 動画詳細ページへのリンクかつ、imgタグに対するリンクではない場合
			if (url.match(G_RE) && $(this).find('img').length==0) {
				$(this).after(createAghElement(url));
			}
		});
		
		$("#leftarea",rootNode).find("a").each(function() {
			var url = $(this).attr('href');
			// 動画詳細ページへのリンクかつ、imgタグに対するリンクではない場合
			if (url.match(G_RE) && $(this).find('img').length==0) {
				$(this).after(createAghElement(url));
			}
		});
	} else {
		$("a",rootNode).each(function() {
			var url = $(this).attr('href');
			// 動画詳細ページへのリンクかつ、imgタグに対するリンクではない場合
			if (url.match(G_RE) && !$(this).hasClass('agh_dialog_link') && $(this).find('img').length==0) {
				$(this).after(createAghElement(url));
			}
		});
	}
}

function init() {
	var body = $('body')[0];
	chrome.extension.sendRequest({"type": "storage"}, function(response) {	
		G_OPTIONS = response;
	});
	
	attachAghElements(body);
	
	// ダイアログの重なりを調整
	var $swf = $('#movie_0');
	if ($swf.size()>0) {
		var $wm = $('<param></param>');
		var $emb = $swf.children('embed').first();
	}
	
	// 新規にDOMが挿入された場合の処理
	body.addEventListener('DOMNodeInserted', function(event){
		attachAghElements(event.target);
	});
}

$(document.body).ready(init);