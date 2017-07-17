var _expansion = false;
var _selectedHintTop;
var _fadeIn = new Audio('sounds/fadeIn.wav');
var _fadeOut = new Audio('sounds/fadeOut.wav');
var _press = new Audio('sounds/press.wav');


window.onload = function (e) {

	var iconEle = document.getElementsByClassName("iconsEle")[0];
	iconEle.addEventListener("mousemove", iconEleMouseoverEvent, true);
	iconEle.addEventListener("mouseout", iconEleMouseoverEvent, true);
	iconEle.addEventListener("click", iconEleMouseoverEvent, true);
	setSlider();
	setPhoneView();
	setLabtopView();

}

function setSlider() {
	setSliderList();
	function setSliderList() {
		setTimeout(function () {
			container = $("#container");
			if (_firstList.length == 0)
				setSliderList();
			else
				setSlider(_firstList);
		}, 50);
	}

	function setSlider(sliderAry) {
		$("#dateSlider").ionRangeSlider({
			type: "single", //double,single
			values: sliderAry,
			// grid: true,
			onFinish: function (data) {
				sliderEvent(data);
			},
			onUpdate: function (data) { //左右鍵
				sliderEvent(data);
			}
		});
	}

	function sliderEvent(data) {
		var yearMon = data["from_value"];
		var nowIndex = $(".selectedText")[0].getAttribute("value");
		var sData; //show Data
		var type;
		if (nowIndex == "0" || nowIndex == "1" || nowIndex == "2" || nowIndex == "3") {//人口增加─按區域別分.json
			type = 0;
			sData = _oData[yearMon];
		}
		else if (nowIndex == "4") { //各縣市別平均每戶可支配所得.json
			type = 1;
			sData = _inComeData[yearMon];
		}
		else if (nowIndex == "5") {  //各縣市別平均每戶儲蓄.json
			type = 2;
			sData = _depositsData[yearMon];
		}

		_taiwan.exit().remove();
		setDatas(sData, type);
		setTimeout(function () {
			updateMsg(_features[_cDataIndex]);
			setTabElement();
		}, 100);

	}
}

function setPhoneView() {
	if (!isPhone())
		return;

	//設定手機板的Icon
	setMobileIcon();

	//地圖置中
	setMiddle();

	//colorBar 寬度調整
	var text = document.getElementsByTagName("text")[0];
	text.setAttribute("x", "0");
	var tspan = $("tspan", text)[1];
	tspan.innerHTML = "　　　　　　";

	//colorBar 高度調高
	var colorBar = $("rect", $(".colorBarEle"))[0];
	colorBar.setAttribute("height", "50");

	//資訊列大調整
	setInfo();

	function setMobileIcon() {
		$("ul").prepend('<i id="ic" class="material-icons icon noselect rotate_transition" onclick="dropdown(this)" value="-1">add_circle_outline</i>');

		$("i").each(function (i) {
			if (i == 0)
				return true;
			$(this).css({ "display": "none" });
		});
	}

	function setMiddle() {
		setTimeout(function () {
			container = $("#container");
			if (container.length == 0)
				setMiddle();
		}, 500);
	}

	function bodyClickEvent(e) {
		alert(0);
	}
}

function setLabtopView() {
	if (!isLaptop())
		return;

	//colorBar 寬度調整
	var text = document.getElementsByTagName("text")[0];
	text.setAttribute("x", "-10");
	var tspan = $("tspan", text)[1];
	tspan.innerHTML = "　　　　　　　";

	setInfo();
}

function setInfo() {
	var tabEle = document.getElementsByClassName("tabEle")[0];
	var footer = document.getElementsByClassName("footer")[0];
	var mobileInfoEle = document.getElementsByClassName("mobileInfoEle")[0];
	var sliderEle = document.getElementsByClassName("sliderEle")[0];
	footer.style.top = $("html").height() - 120 + "px";
	mobileInfoEle.appendChild(tabEle);
}

function iconEleMouseoverEvent(e) {
	var t = e.type;
	var text = e.target.title;
	if (!text) //防呆
		return;
	var aEle = document.getElementsByClassName("hintHover")[0];
	if (t == "mousemove") {
		if (isPhone() || isLaptop()) {
			return; //手機不要hover
		}
		var a = document.getElementsByClassName("hintText")[0]; //設定文字
		aEle.style.opacity = 1; //顯示出來
		var h = aEle.offsetHeight;
		aEle.style.top = e.layerY - h / 2 + "px"; //置中 
		a.innerHTML = text;
	} else if (t == "click") {
		var selected = document.getElementsByClassName("hintSelected")[0];
		var a = document.getElementsByClassName("selectedText")[0]; //設定文字
		var ih = e.target.offsetHeight;
		var sh = selected.offsetHeight;
		var h = (ih - sh) / 2;
		var v = e.target.getAttribute("value");

		a.innerHTML = text;
		a.setAttribute("value", v);
		_selectedHintTop = e.target.offsetTop + h;
		selected.style.top = _selectedHintTop + "px";
		if (isPhone()) {
			_press.play();
			dropClose(true);
		}
	}
	else if (t == "mouseout") {
		aEle.style.opacity = 0; //隱藏起來
	}
}

function setDataByIndex(e) {
	var v = parseInt(e.getAttribute("value"));
	_statsIndex = v;
	updateSliderList(v);
	setTaiwan();
	resetColorBar();
}

function updateSliderList(index) {
	var slider = $("#dateSlider").data("ionRangeSlider");
	var data;
	var from_value = slider["result"]["from_value"];
	var from = 0;
	var i = 0;
	var list = [];


	if (index < 4)
		data = _oData;
	else if (index == 4)
		data = _inComeData;
	else if (index = 5)
		data = _depositsData;

	if (index < 4 && !from_value.includes("月"))
		from_value = from_value + "1月";
	else if (index > 3 && from_value.includes("月"))
		from_value = from_value.split('年')[0] + "年";

	for (var key in data) {
		if (key == from_value)
			from = i;
		list.push(key);
		i++;
	}


	slider.update({
		"values": list,
		"from": from
	});

}


function resetColorBar() {
	var colorRag = _model[_statsIndex]["colorRag"];
	var line = document.getElementsByTagName("stop");
	line[0].setAttribute("stop-color", colorRag[0]);
	line[1].setAttribute("stop-color", colorRag[1]);
}

function contolSliderEvent(e) {
	var v = e.getAttribute("value");
	var slider = $("#dateSlider").data("ionRangeSlider");
	var min = slider["result"]["min"];
	var max = slider["result"]["max"];
	var nValue = slider["result"]["from"];

	if (v == "add") {
		nValue += 1;
		if (nValue > max)
			nValue = 0;

		slider.update({
			from: nValue
		});
	} else if (v == "less") {
		nValue -= 1;
		if (nValue < min)
			nValue = max;

		slider.update({
			from: nValue
		});

	}
}


function dropdown(e) {
	if (!_expansion)  //展開
		dropOpen();
	else
		dropClose();
}

function dropOpen() {
	$(".bg_mask").css({ "opacity": "0.8", "z-index": "1000" });
	$(".iconsEle").css({ "z-index": "1001" });
	var iconCtrl = $("#ic");
	var selected = document.getElementsByClassName("hintSelected")[0];
	iconCtrl[0].innerHTML = "remove_circle_outline";
	iconCtrl.removeClass("rotate_start");
	iconCtrl.addClass("rotate_end");
	_fadeIn.play();
	$("i").each(function (i) {
		var _this = $(this);
		setTimeout(function () {
			_this.fadeIn();
		}, i * 50);
		_expansion = true;
	});

	if (!_selectedHintTop)
		_selectedHintTop = 69.5;//預設第一次近來

	selected.style.top = _selectedHintTop + "px";
}

function dropClose(pressed) {
	$(".bg_mask").css({ "opacity": "0" });
	$(".iconsEle").css({ "z-index": "999" });
	setTimeout(function () {
		$(".bg_mask").css({ "z-index": "-999" });
	}, 500);
	var iconCtrl = $("#ic");
	var selected = document.getElementsByClassName("hintSelected")[0];
	iconCtrl[0].innerHTML = "add_circle_outline";
	iconCtrl.removeClass("rotate_end");
	iconCtrl.addClass("rotate_start");
	if (!pressed)
		_fadeOut.play();
	$($("i").get().reverse()).each(function (i) { //縮起來
		if (i == 6)
			return true;
		var _this = $(this);
		setTimeout(function () {
			_this.fadeOut();
		}, i * 50);
		_expansion = false;
	});

	var ih = iconCtrl[0].offsetHeight;
	var sh = selected.offsetHeight;
	var h = (ih - sh) / 2;

	selected.style.top = iconCtrl[0].offsetTop + h + "px";
}

function getWhichNow() {
	var selected = document.getElementsByClassName("selectedText")[0];
	var index = selected.getAttribute("value");
	index = parseInt(index) + 1;
	return $("i")[index];
}

