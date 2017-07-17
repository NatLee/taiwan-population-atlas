var _oData; //原始的資料
var _nData; //現在的資料
var _cDataIndex; //選到的資料
var _features; //餵給D3.js(臺灣地圖)的資料格式
var _taiwan;  //臺灣的元件
var _firstList = []; //Slider第一次的清單
var _statsIndex = 0; //Icon第幾個
var _nYearMon;//現在的Slider日期 (因為格式不一樣 ex：1994年5月 -> 2004年)
var _inComeData;
var _depositsData;
var _taiwanNews;
var _ctrlBtnTop;


var _month = ["1月", "2月", "3月", "4月",
    "5月", "6月", "7月", "8月",
    "9月", "10月", "11月", "12月",]

var _model = [
    {
        "id": "人口數(人)",
        "colorRag": ["#00FF00", "#FF0000"],
        "range": [0, 3500000],
        "type": "int"
    },
    {
        "id": "總增加率",
        "colorRag": ["#B9EDF8", "#0000A1"],
        "range": [-3, 3],
        "type": "double"
    },
    {
        "id": "自然增加率",
        "colorRag": ["#F40076", "#35CE8D"],
        "range": [-1, 1],
        "type": "double"
    },
    {
        "id": "社會增加率",
        "colorRag": ["#00303F", "#FF5A09"],
        "range": [-2, 2],
        "type": "double"
    }
    ,
    {
        "id": "可支配所得",
        "colorRag": ["#b4b545", "#b54545"],
        "range": [500000, 1000000],
        "type": "int"
    },
    {
        "id": "每戶儲蓄",
        "colorRag": ["#FFB85F", "#3E78B2"],
        "range": [85000, 300000],
        "type": "int"
    }
]

$(document).ready(function () { //初始化
    setPopulationData(); //設定人口變動資料
    loadIncomeData();
    loadDepositsData();
    loadTaiwanNews();
    tabsSetting();
    _ctrlBtnTop = document.getElementsByClassName("ctrlBtn")[0].offsetTop;
});

function setPopulationData() {
    $.getJSON("datas/人口增加─按區域別分.json", function (data) { //載入資料
        _oData = data;
        setCountyData(); //設定縣市資料
        document.getElementsByTagName("svg")[0].addEventListener("click", function () { //點背景反彈
            $("path").addClass("choice");
        }, true);

        for (var i in data) {
            _firstList.push(i);
        }
    });
}

function loadIncomeData() {
    $.getJSON("datas/各縣市別平均每戶可支配所得.json", function (data) { //載入資料
        _inComeData = data;
    });
}

function loadDepositsData() {
    $.getJSON("datas/各縣市別平均每戶儲蓄.json", function (data) { //載入資料
        _depositsData = data;
    });
}

function loadTaiwanNews() {
    $.getJSON("datas/臺灣大事件.json", function (data) { //載入資料
        _taiwanNews = data;
    });
}

function setCountyData() {
    d3.json("datas/county.json", function (topodata) { //因為原始資料檔案太大load太久，會導致後面的程式碼先執行，所以要包在裡面
        _features = topojson.feature(topodata, topodata.objects.county).features;
        setSvgEle();
        setDatas(null, 0);
    })
}

function setSvgEle() {
    var mapEle = $(".mapEle")[0];
    var margin = { top: 0, right: 0, bottom: 0, left: 10 },
        width = mapEle.offsetWidth - margin.left - margin.right,
        height = mapEle.offsetHeight - margin.top - margin.bottom - 4;

    var zoom = d3.behavior.zoom()
        .scaleExtent([1, 10])
        .on("zoom", zoomed);

    var drag = d3.behavior.drag()
        .origin(function (d) {
            return d;
        })
        .on("drag", dragged);

    var svg = d3.select("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.right + ")")
        .call(zoom);

    var rect = svg.append("rect")
        .attr("width", $("html").width())//width
        .attr("height", $("html").height()) //height
        .style("fill", "none")
        .style("pointer-events", "all");

    var container = svg.append("g")
        .attr("id", "container");

    if (isPhone()) {//手機要設預設
        d3.select("svg").attr("viewBox", "0 25 350 900")
        zoom.translate([-456.65740993861266, 179.2119462621692]).scale(1.65);
        container.attr("transform", "translate(-456.65740993861266,179.2119462621692)scale(1.65)");
    } else if (isLaptop()) {
        zoom.translate([-408.5175076949754, -244.02137915086405]).scale(2.3);
        container.attr("transform", "translate(-408.5175076949754,-244.02137915086405)scale(2.3)");
    }


    function zoomed() {
        container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    }

    function dragged(d) {
        // event.preventDefault();
        d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
    }
}

function setDatas(sData, type) {
    if (!sData)
        sData = getFirstValueFromObject();

    _nData = sData;
    for (i = 0; i < _features.length; i++) {
        _features[i]["properties"]["人口數(人)"] = [];
        _features[i]["properties"]["總增加率"] = [];
        _features[i]["properties"]["自然增加率"] = [];
        _features[i]["properties"]["社會增加率"] = [];
        _features[i]["properties"]["可支配所得"] = [];
        _features[i]["properties"]["每戶儲蓄"] = [];
        for (j = 1; j < sData.length; j++) {
            if (normlizion_city_name(_features[i]["properties"]["C_Name"]) == normlizion_city_name(sData[j]["地區"])) {
                if (type == 0) {
                    _features[i]["properties"]["人口數(人)"] = sData[j]["人口數(人)"];
                    _features[i]["properties"]["總增加率"] = sData[j]["總增加率"];
                    _features[i]["properties"]["自然增加率"] = sData[j]["自然增加率"];
                    _features[i]["properties"]["社會增加率"] = sData[j]["社會增加率"];
                } else if (type == 1) {
                    _features[i]["properties"]["可支配所得"] = sData[j]["可支配所得"];
                } else if (type == 2) {
                    _features[i]["properties"]["每戶儲蓄"] = sData[j]["每戶儲蓄"];
                }
            }
        }
    }
    setTaiwan();
}

function getFirstValueFromObject() {
    var firstValue;
    $.each(_oData, function (key, value) {
        firstValue = key;
        return false; //等於break
    });
    return _oData[firstValue];
}


function setTaiwan() {

    var colorRag = _model[_statsIndex]["colorRag"];
    var range = _model[_statsIndex]["range"];


    var prj = function (v) {
        var ret = d3.geo.mercator().center([122, 23.25]).scale(5200)(v);
        return [ret[0], ret[1]];
    };
    var path = d3.geo.path().projection(prj);
    var color = d3.scale.linear().domain(range).range(colorRag);
    _taiwan = d3.select("#container").selectAll("path").data(_features);
    _taiwan.enter().append("path").attr("class", "choice").attr({
        "d": path,
        "fill": function (d) {
            return judgmentData(d);
        }
    });

    function judgmentData(d) {
        var key = _model[_statsIndex]["id"];
        var type = _model[_statsIndex]["type"];
        if (type == "int")
            return color(parseInt(eval(d["properties"][key])));
        else if (type == "double")
            return color(parseFloat(eval(d["properties"][key])));
    }


    function update() {
        d3.select("svg").selectAll("path").attr({
            "d": path,
            "fill": function (d) {
                return judgmentData(d);
            },
            "stroke": 'green'
        }).on("mouseover", function (d, evnt) {
            if (!isPhone() && !isLaptop())
                $(this).attr('fill', 'White');

        }).on("mouseleave", function (d) {

            $(this).attr('fill', judgmentData(d));

        }).on("click", function (d) {
            $(".choice").removeClass("choice");
            if (!isPhone() && !isLaptop())
                $(this).attr('fill', 'White');
            $(this).attr("class", "choice");

            updateMsg(d);
            setTabElement();
            // if (isPhone() && $("#countyStr").height() == 0)
            //     $(".county").click();
        });
    }
    update();
}

function updateMsg(d) {
    var msg = "";
    if (!d) //甚麼都沒點 防呆|| isPhone()
        return;

    $("#info").show();
    $("#name").text(d.properties.C_Name);
    var key = "";
    if (_statsIndex == 0)
        key = "人口數(人)";
    else if (_statsIndex == 1)
        key = "總增加率";
    else if (_statsIndex == 2)
        key = "自然增加率";
    else if (_statsIndex == 3)
        key = "社會增加率";
    else if (_statsIndex == 4)
        key = "可支配所得";
    else if (_statsIndex == 5)
        key = "每戶儲蓄";
    msg += "日期：" + $("#dateSlider").data("ionRangeSlider").result.from_value + "<br/>";

    var value = checkValue(eval(d["properties"][key]));
    msg += key + "：" + value;
    if (value.includes("尚無資料"))
        msg += "<br/>";
    else if (_statsIndex == 0)
        msg + "人<br/>";
    else if (_statsIndex == 1 || _statsIndex == 2 || _statsIndex == 3)
        msg += "‰<br/>";
    else if (_statsIndex == 4 || _statsIndex == 5)
        msg += "元<br/>";

    _cDataIndex = d["properties"]["OBJECTID"] - 1;
    $("#case").html(msg);
}

function checkValue(v) {
    if (!v || v.length == 0)
        return " 尚無資料 ";
    else
        return v + "";
}

function normlizion_city_name(city_name) {
    city_name = city_name.replace("臺", "台");
    if (city_name == "台北縣") return "新北市";
    if (city_name == "台中縣") return "台中市";
    if (city_name == "台中") return "台中市";
    if (city_name == "基隆") return "基隆市";
    return city_name;
}

function isPhone() {
    if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
        return true;
    else
        return false;
}

function isLaptop() {
    if (/iPad/i.test(navigator.userAgent))
        return true;
    else
        return false;
}

function getEleByClass(className) {
    return document.getElementsByClassName(className)[0];
}

function openNews(e, cityName) {
    var i, tabcontent, tablinks;
    var tarName = e.target.name;
    var oldContent = document.getElementsByName("display")[0]; //舊的
    var newContent = document.getElementById(cityName); //新的
    var show = { "height": "80%", "opacity": "1" };
    var hide = { "height": "0%", "opacity": "0" };
    var footer = getEleByClass("footer");
    var header = getEleByClass("header");
    var colorBarEle = getEleByClass("colorBarEle");
    var iconsEle = getEleByClass("iconsEle");
    var tab = getEleByClass("tab");
    var ph = $("html").height() - header.offsetHeight - getHeightByClass("sliderEle") - getHeightByClass("tab") + "px";//phoneHeight
    var lh = "350px";//LabtopHeight

    newsOpen_phone();
    if (oldContent == newContent) { //選到自己
        if (newContent.offsetHeight > 0) {//是打開的
            $(newContent).css(hide);
            newsClose_phone();
        }
        else {//是關起來的
            $(newContent).css(show);
        }
    } else { //選到另一個
        if (oldContent.offsetHeight > 0) {//沒打開
            $(oldContent).css(hide);
        }
        $(newContent).css(show);
    }
    oldContent.setAttribute("name", null);
    newContent.setAttribute("name", "display");

    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) { //全部移除
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    if (e.currentTarget)
        e.currentTarget.className += " active"; //套用選到的效果
    else
        getEleByClass("county").className += " active"; //點地圖的話會沒東西

    function newsOpen_phone() {
        if (isPhone() || isLaptop()) {
            if (isPhone()) {
                show["height"] = ph;
                colorBarEle.style.opacity = "0"; //設定透明度0
                iconsEle.style.opacity = "0"; //設定透明度0
                footer.style.top = (header.offsetTop + header.offsetHeight) + "px"; //footer往上移動
                $(".ctrlBtn").css("top", _ctrlBtnTop - 150 + "px"); //ctrlBtn往上移動

            } else { //isLabtop
                show["height"] = lh;
                footer.style.top = ($("html").height() - tab.offsetHeight - 350) + "px"; //HTML高度減掉Tab高度跟News高度
                $(".ctrlBtn").css("top", _ctrlBtnTop - 300 + "px"); //ctrlBtn往上移動
            }
        }
    }

    function newsClose_phone() {
        if (isPhone() || isLaptop()) {
            colorBarEle.style.opacity = "1";
            iconsEle.style.opacity = "1";
            footer.style.top = $("html").height() - 120 + "px";
            $(".ctrlBtn").css("top", _ctrlBtnTop + "px");
        }

    }

    function getHeightByClass(cName) {
        return $("." + cName).height();
    }
}

function setTabElement() {
    var county = $("#name")[0].innerHTML;
    if (county)
        document.getElementsByClassName("county")[0].innerHTML = county;
    var dateTime = $("#dateSlider").data("ionRangeSlider").result.from_value;
    if (isPhone() || isLaptop())
        $("h3", $(".tabcontent")).html($("#case")[0].innerHTML);
    else
        $("h3", $(".tabcontent")).html("日期：" + dateTime);
    $("p", $(".tabcontent")).remove();

    if (!dateTime.includes("月") && county) { //如果只有年份
        var cNews = [];
        var oNews = [];
        for (var i = 0; i < _month.length; i++) {
            var nDateTime = dateTime + _month[i];
            if (_taiwanNews[nDateTime][county].length > 0) {
                var ary = _taiwanNews[nDateTime][county];
                for (var k = 0; k < ary.length; k++) {
                    cNews.push(ary[k]);
                }
            }
            if (_taiwanNews[nDateTime]["其他"].length > 0) {
                var ary = _taiwanNews[nDateTime]["其他"];
                for (var k = 0; k < ary.length; k++) {
                    oNews.push(ary[k]);
                }
            }

        }
        if (cNews.length == 0)
            noNews(1);
        else
            setNews(cNews, 1);
        if (oNews.length == 0) //其他沒資料
            noNews(2);
        else //其他有資料
            setNews(oNews, 2);

        return;
    }
    else if (!_taiwanNews[dateTime] || !_taiwanNews[dateTime][county] || (_taiwanNews[dateTime][county].length == 0 && _taiwanNews[dateTime]["其他"].length == 0)) {
        noNews(0);
        return;
    }


    var countyNews = _taiwanNews[dateTime][county];
    var othersNews = _taiwanNews[dateTime]["其他"];
    if (countyNews.length == 0)//縣市沒資料
        noNews(1);
    else //縣市有資料
        setNews(countyNews, 1);

    if (othersNews.length == 0) //其他沒資料
        noNews(2);
    else //其他有資料
        setNews(othersNews, 2);

    function noNews(type) {
        var parent = $(".tabcontent");
        var p = "<p>很抱歉，尚無重大新聞。</p>";
        if (type == 0) {
            parent = $(".tabcontent");
        } else if (type == 1)//縣市沒資料
            parent = $("#countyStr");
        else if (type == 2)//其他沒資料
            parent = $("#othersStr");
        parent.append(p);

    }

    function setNews(data, type) {
        var parent;
        if (type == 1)
            parent = $("#countyStr");
        else if (type == 2)//縣市沒資料
            parent = $("#othersStr");


        for (var i = 0; i < data.length; i++) {
            var p = document.createElement("p");
            p.innerHTML = data[i];
            parent.append(p);
        }


    }

}

//設定Tab的拖拉事件
function tabsSetting() {
    if (isPhone() || isLaptop())
        return;
    document.getElementById("defaultOpen").click();
    var body = document.getElementsByTagName("body")[0];
    var flag = 1;
    var tab = document.getElementsByClassName("tab")[0];

    tab.addEventListener("mousedown", function (e) {
        onMouseDown(this, e);
    }, false);
    tab.addEventListener("mouseup", function (e) {
        onMouseUp(e);
    }, false);
    tab.addEventListener("mousemove", function (e) {
        onMouseMove(e);

    }, false);

    var anchorX = 0;
    var anchorY = 0;
    var draggedEl;
    function onMouseDown(div, e) {
        anchorX = e.x;
        anchorY = e.y;

        var p = div;
        while (p.parentNode != null) {
            anchorX -= p.offsetLeft - p.scrollLeft;
            anchorY -= p.offsetTop - p.scrollTop;
            p = p.parentNode;
        }
        draggedEl = div;
    }

    function onMouseMove(e) {
        if (!draggedEl)
            return;

        draggedEl.parentElement.style.left = (e.x - anchorX) + "px";
        draggedEl.parentElement.style.top = (e.y - anchorY) + "px";
    }

    function onMouseUp(e) {
        draggedEl = null;

    }
}