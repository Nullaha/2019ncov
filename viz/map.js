// 基于准备好的dom，初始化echarts实例
var myChart = echarts.init(document.getElementById('map'));


//设置容器高宽
resizeContainer('map', 'firstBlock');


var template_map = {
    name: '疑似',
    type: 'map',
    mapType: 'china',
    selectedMode : 'multiple',
    roam: false, //缩放
    label: {
        normal: {
            show: true,
            textStyle: {
                color: 'black',
                backgroundColor: '#dedede',
                borderRadius: 3,
                padding: 0.5,
            }
        },
        emphasis: {
            show: true
        }
    },
    nameMap:[],
    data:[]
};
//存储切换的每一级地图信息
var mapStack = [];
var timeFn = null;
var curMap = {};
//初始化为中国地图
load_data('china', 'china', 'province_level');

/**
 绑定用户切换地图区域事件
 cityMap对象存储着地图区域名称和区域的信息(name-code)
 当mapCode有值,说明可以切换到下级地图
 同时保存上级地图的编号和名称
 */
myChart.on('mapselectchanged', function(params) {
    let map_level = $("#firstBlock .btn-outline-primary").attr('level');
    if (map_level != "world_level"){
        if (map_level == 'province_level'){//省级粒度的地图才下钻 || 世界地图下钻到中国地图
            clearTimeout(timeFn);
            //由于单击事件和双击事件冲突，故单击的响应事件延迟250毫秒执行
            timeFn = setTimeout(function(){
                let name = params.batch[0].name;
                if (mapStack.length < 1) //将最大下钻深度设置为2(到地级市)
                {
                    load_data('province/'+name, name, 'province_level', true);
                    //将上一级地图信息压入mapStack
                    mapStack.push({
                        mapName: curMap.mapName
                    });
                }
            }, 250);
        }

        /**
         * 电脑端，鼠标点击到对应的省份上面，联动更新饼状图统计、柱状图和折线图
         */
        let area = params.batch[0].name;
        draw_pie(pie_dom_id, area, '');
        draw_pie(pie_gender_dom_id, area ,'gender/');
        draw_bar(bar_dom_id, area);
        draw_cure_die_bar(bar_die_cure_ratio_dom_id, area);
        draw_bar_age(bar_age_dom_id, area);
        draw_bar_ratio(bar_ratio_dom_id, area, '');
        draw_bar_density(bar_density_dom_id, area, '');

        draw_lineBar(area);
        draw_calPie(area);
    }
});

/**
 绑定双击事件，并加载上一级地图
 */
// myChart.on('dblclick', function(params) {
//     drill_up()
// });

function drill_up() {
    let map_level = $("#firstBlock .btn-outline-primary").attr('level');
    if (map_level == 'province_level') {//省级粒度的地图才下钻/上卷
        // 当双击事件发生时，清除单击事件，仅响应双击事件
        clearTimeout(timeFn);
        let map = mapStack.pop();
        if (!mapStack.length && !map) {
            alert('已经到达最上一级地图了');
            return;
        }
        // console.log('drill up');
        load_data('china', map.mapName, 'province_level')
    }
    /**
     * 电脑端，鼠标点击到对应的省份上面，联动更新饼状图统计、柱状图和折线图
     */
    draw_pie(pie_dom_id, '中国', '');
    draw_pie(pie_gender_dom_id, '中国' ,'gender/');
    draw_bar(bar_dom_id, '中国');
    draw_cure_die_bar(bar_die_cure_ratio_dom_id, '中国');
    draw_bar_age(bar_age_dom_id, '中国');
    draw_bar_ratio(bar_ratio_dom_id, '中国', 'district_level');
    draw_bar_density(bar_density_dom_id, '中国', 'district_level');

    draw_lineBar('中国');
    draw_calPie('中国');
}


//切换地图的map
$(".btn-maps").click(function () {
    $(".btn-maps").removeClass("#firstBlock btn-outline-primary");
    $(".btn-maps").addClass("#firstBlock btn-outline-secondary");
    $(this).addClass("#firstBlock btn-outline-primary");
    $(this).removeClass("#firstBlock btn-outline-secondary");
    let which_map = $(this).attr('level');
    if (which_map == "world_level") {
        world_map();
        // $('.china-vis').hide();
        draw_bar(bar_dom_id, 'world');
        draw_calPie('world');
        draw_lineBar('world');
        draw_cure_die_bar(bar_die_cure_ratio_dom_id, 'world');
    }
    if (which_map == "province_level"){
        //初始化为中国地图
        // $('.china-vis').show();
        load_data('china', 'china', 'province_level');
        draw_bar(bar_dom_id, '中国','');
        draw_pie(pie_dom_id, '中国', '');
        draw_pie(pie_gender_dom_id, '中国' ,'gender/');
        draw_lineBar('中国');
        draw_bar_age(bar_age_dom_id, '中国');
        draw_bar_ratio(bar_ratio_dom_id, '中国', 'district_level');
        draw_bar_density(bar_density_dom_id, '中国', 'district_level');
        draw_calPie('中国');
    }
    if (which_map == "district_level"){
        // $('.china-vis').show();
        load_data('china', 'china', 'district_level');
        draw_bar(bar_dom_id, '中国','district_level');
        draw_pie(pie_dom_id, '中国', '');
        draw_pie(pie_gender_dom_id, '中国' ,'gender/');
        draw_lineBar('中国');
        draw_bar_age(bar_age_dom_id, '中国');
        draw_bar_ratio(bar_ratio_dom_id, '中国', 'district_level');
        draw_bar_density(bar_density_dom_id, '中国', 'district_level');
        draw_calPie('中国');
    }

});


/**
 加载地图上的数据文件
 dataFile: 地图数据文件名字
 mapName: 地图JSON文件的名字
 level: 地图的level（world，nation，city）
 dirllDown: 地图的下钻功能
 */

function load_data(dataFile, mapName, level, drillDown=false){
    // console.log('start load data');
    myChart.showLoading();
    let dataUrl;
    if (!drillDown)
        //如果不dirll down
        dataUrl = './data/data/'+dataFile+level+'.json';
    else
        dataUrl = './data/data/'+dataFile+'.json';
    // console.log('dataUrl:', dataUrl);
    $.get(dataUrl, function (data) {
        // console.log('data:', data);
        let map_settings = {
            dateRanges: [],
            lastUpdate: "",
        };
        let series_data = [];
        // let time_range = (7 > data.length ? data.length : 7);
        map_settings.lastUpdate = data['last_update'];
        template_map['mapType'] = mapName;
        if (level == 'district_level'){
            template_map['label']['normal']['show'] = false;
        }else{
            template_map['label']['normal']['show'] = true;
        }
        for (let i = data.length-1; i >=0 ; i--){
            map_settings.dateRanges.push(data[i]['time'].slice(5,data[i]['time'].length));
            let confirm_data = $.extend(true,{},template_map);
            let current_confirm_data = $.extend(true,{},template_map); // 当前现存确诊人数
            let die_data = $.extend(true,{},template_map);
            let cure_data = $.extend(true,{},template_map);
            current_confirm_data.name = '现存确诊';
            confirm_data.name = '累计确诊';
            cure_data.name = '累计治愈';
            die_data.name = '累计死亡';
            if(drillDown==true) level = 'district_level';
            confirm_data.data = data[i].confirm[level];
            current_confirm_data.data = data[i].currentConfirm[level];
            cure_data.data = data[i].cure[level];
            die_data.data = data[i].die[level];
            series_data.push({
                series: [confirm_data, current_confirm_data, die_data, cure_data]
            })
        }
        // console.log(series_data);
        // console.log('load done, and draw.');
        if (level == 'province_level' || drillDown==true){
            let tag = '';
            if (drillDown == false)
                tag = 'province_level';
            let subtext = show_overall_map(series_data, tag, mapName);
            draw_map(mapName, series_data, map_settings, subtext)
        }else{
            // console.log('draw district');
            draw_map_district(series_data, map_settings)
        }
        if (level == 'world_level'){
            world_map(series_data, map_settings)
        }
    });
}


// 绘制县市级别的热力图
function draw_map_district(series_data, map_settings) {
    // console.log('draw district level');
    myChart.showLoading();
    $.get('./echarts/map/json/china-cities.json', function(geoJson) {
        echarts.registerMap('china', geoJson);
        let dateRanges = map_settings['dateRanges'];
        let base_option = {
            label:{
                show: false
            },
            timeline: {
                autoPlay: false,
                loop: false,
                playInterval: 800,
                top: 'auto',
                currentIndex: dateRanges.length-1,
                axisType: 'category',
                data: dateRanges
            },
            title: {
                text: 'COVID-19疫情地图（中国）',
                subtext: '',//'数据来源：国家及各省市地区卫健委',
                subtextStyle:{//副标题内容的样式
                    color:'green',//绿色
                    fontStyle:'normal',//主标题文字字体风格，默认normal，有italic(斜体),oblique(斜体)
                    fontFamily:"san-serif",//主题文字字体，默认微软雅黑
                    fontSize:14//主题文字字体大小，默认为12px
                },
                // sublink: 'https://github.com/BlankerL/DXY-2019-nCoV-Data',
                left: 'center'
            },
            tooltip: {
                trigger: 'item',
                formatter: '{b}<br/>病例数: {c}'
            },
            color: ['#d48265','#2f4554','#c23531','#749f83'],
            legend: {
                orient: 'vertical',
                left: 'left',
                data:['现存确诊','累计确诊', '累计治愈','累计死亡'],
                selectedMode: 'single',
                selected: {
                    '累计确诊': false,
                    '累计治愈': false,
                    '累计死亡': false
                }
            },
            visualMap: {
                type : 'piecewise',
                showLabel: true,
                pieces: [
                    {min: 1000, color: "rgb(112,22,29)"}, // 不指定 max，表示 max 为无限大（Infinity）。
                    {min: 500, max: 999, color: 'rgb(203,42,47)'},
                    {min: 100, max: 499, color: 'rgb(229,90,78)'},
                    {min: 10, max: 99, color: 'rgb(245,158,131)'},
                    {min: 1, max: 9, color: 'rgb(253,235,207)'},
                ],
                left: 'left',
                top: 'bottom',
                // text: ['多','少'],           // 文本，默认为数值文本
                calculable: true
            },
            toolbox: {
                show: true,
                // orient: 'vertical',
                right: '10%',
                top: 'top',
                itemSize: 30,
                itemGap: 30,
                feature: {
                    saveAsImage: {
                        pixelRatio: 5
                    },
                }
            },
            series: []
        };
        let option = {
            baseOption: base_option,
            options:series_data
        };

        myChart.hideLoading();
        myChart.setOption(option);
        $("#btn-city-map").prop('disabled', false);
    });
}

/**
 展示当前级别地图所有的确诊/疑似/治愈/死亡人数 TEXT
 */
function show_overall_map(series_data, tag, mapName){
    // tag 是用来把province中的外国数据剔除
    // mapName 是用来去除四个直辖市中的重复数据，例如 北京：【北京，海淀区，朝阳区】
    let CHINA_PROVINCES = ['湖北', '广东', '浙江','河南','湖南', '安徽', '江西', '重庆','江苏', '山东',  '四川', '北京','上海', '福建','陕西','广西', '黑龙江', '云南', '河北','辽宁', '海南', '山西','天津', '甘肃', '贵州','内蒙古',  '台湾',  '宁夏', '吉林',   '新疆',   '青海',    '澳门',  '西藏', '香港']
    let data = series_data[series_data.length-1]['series'];
    let subtext = "";
    // console.log(data);
    for (let i = 0; i < data.length; i++){
        if (data[i]['name'] != "疑似"){
            subtext += data[i]['name'] + ": ";
            let total = 0;
            for (let j = 0; j < data[i]['data'].length; j++){
                if (tag == 'province_level') //只有中国省级地图才这样子做 TODO
                {
                    if (CHINA_PROVINCES.indexOf(data[i]['data'][j]['name']) != -1)
                        total += data[i]['data'][j]['value'];
                }
                else
                {
                    if (mapName != data[i]['data'][j]['name']){
                        total += data[i]['data'][j]['value'];
                    }
                }
            }
            // if (total == 0) total = '暂缺';
            subtext += total.toString() + "   ";
        }
    }
    // console.log(subtext);
    return subtext;
}

/**
 加载地图：根据地图所在省市的行政编号，
 获取对应的json地图数据，然后向echarts注册该区域的地图
 最后加载地图信息
 @params {String} mapName: 地图名称
 */
function draw_map(mapName, series_data, map_settings, subtext) {
    $.getJSON('./echarts/map/json/province/' + mapName + '.json', function (data) {
        if (data) {
            // if (mapName != 'china'){ //如果是中国地图，则用默认的，这样南海诸岛才能出来
            echarts.registerMap(mapName, data);
                // console.log('register map')
            // }
            let title_text= mapName;

            let dateRanges = map_settings['dateRanges'];
            if (mapName == 'china')
            {
                title_text = '中国';
                subtext += '\n\n 点击省份，可以查看详细数据';
            }
            let base_option = {
                timeline: {
                    autoPlay: false,
                    loop: false,
                    top: 'auto',
                    playInterval: 800,
                    currentIndex: dateRanges.length-1,
                    axisType: 'category',
                    data: dateRanges
                },
                title: {
                    text: 'COVID-19疫情地图（'+title_text+'）',
                    subtext: subtext, //'数据来源：国家及各省市地区卫健委',
                    subtextStyle:{//副标题内容的样式
                        color:'green',//绿色
                        fontStyle:'normal',//主标题文字字体风格，默认normal，有italic(斜体),oblique(斜体)
                        fontFamily:"san-serif",//主题文字字体，默认微软雅黑
                        fontSize:14//主题文字字体大小，默认为12px
                    },
                    // sublink: 'https://github.com/BlankerL/DXY-2019-nCoV-Data',
                    left: 'center'
                },
                tooltip: {
                    trigger: 'item',
                    formatter: '{b}的病例数: {c}<br/>单击查看详情<br/>单击右上角返回上一级'
                },
                color: ['#d48265', '#2f4554', '#c23531','#749f83'],
                legend: {
                    orient: 'vertical',
                    left: 'left',
                    data:['现存确诊','累计确诊', '累计治愈','累计死亡'],
                    selectedMode: 'single',
                    selected: {
                        '累计确诊': false,
                        '累计治愈': false,
                        '累计死亡': false,
                        '现存确诊': true,
                    }
                },
                visualMap: {
                    type : 'piecewise',
                    showLabel: true,
                    pieces: [
                        {min: 1000, color: "rgb(112,22,29)"}, // 不指定 max，表示 max 为无限大（Infinity）。
                        {min: 500, max: 999, color: 'rgb(203,42,47)'},
                        {min: 100, max: 499, color: 'rgb(229,90,78)'},
                        {min: 10, max: 99, color: 'rgb(245,158,131)'},
                        {min: 1, max: 9, color: 'rgb(253,235,207)'},
                    ],
                    left: 'left',
                    top: 'bottom',
                    // text: ['多','少'],           // 文本，默认为数值文本
                    calculable: true
                },
                toolbox: {
                    show: true,
                    // orient: 'vertical',
                    right: '10%',
                    top: 'top',
                    itemSize: 30,
                    itemGap: 30,
                    feature: {
                        myDrillUp: {
                            show: true,
                            title: '返回上一级',

                            icon: 'image:///images/return.svg',
                            onclick: function (){
                                drill_up()
                            }
                        },
                        saveAsImage: {
                            pixelRatio: 5
                        }
                    }
                },
                series: []
            };

            let option = {
                baseOption: base_option,
                // timeline上每个时间间隔对应的option（data）
                options: series_data
            };

            myChart.hideLoading();
            myChart.setOption(option);
            curMap = {
                mapName: mapName
            };
            $("#btn-province-map").prop('disabled', false);
        } else {
            alert('无法加载该地图');
        }
    });
}

// world_map();
function world_map() {
    myChart.showLoading();
    $.getJSON('./data/data/world_map.json', function (data) {
        let each_series_template = {
            name: '现存确诊',
            type: 'map',
            map: 'world',
            itemStyle:{
                emphasis:{label:{show:false}}
            },
            nameMap: nameMap,
            selectedMode : 'multiple',
            roam: false, //缩放
            label: {
                normal: {
                    show: false
                },
                emphasis: {
                    show: true
                }
            },
            data:[]
        };
        let series_data = [];
        let dateRanges = [];
        for (let i = data.length-1; i >=0 ; i--){
            dateRanges.push(data[i]['time'].slice(5,data[i]['time'].length));
            let current_confirm_data = $.extend(true,{},each_series_template);
            let confirm_data = $.extend(true,{},each_series_template);
            let die_data = $.extend(true,{},each_series_template);
            let cure_data = $.extend(true,{},each_series_template);
            confirm_data.name = '累计确诊';
            current_confirm_data.name = '现存确诊';
            cure_data.name = '累计治愈';
            die_data.name = '累计死亡';
            confirm_data.data = data[i].confirm;
            current_confirm_data.data = data[i].currentConfirm;
            cure_data.data = data[i].cure;
            die_data.data = data[i].die;
            series_data.push({
                series: [current_confirm_data, confirm_data, die_data, cure_data]
            })
        }

        let subtext = show_overall_map(series_data, 'world_level', null);

        let world_option = {
            baseOption: {
                timeline: {
                    autoPlay: false,
                    loop: false,
                    top: 'auto',
                    playInterval: 800,
                    currentIndex: dateRanges.length-1,
                    axisType: 'category',
                    data: dateRanges
                },
                title: {
                    text: 'COVID-19世界疫情地图',
                    subtext: subtext, //'数据来源：国家及各省市地区卫健委',
                    subtextStyle:{//副标题内容的样式
                        color:'green',//绿色
                        fontStyle:'normal',//主标题文字字体风格，默认normal，有italic(斜体),oblique(斜体)
                        fontFamily:"san-serif",//主题文字字体，默认微软雅黑
                        fontSize:14//主题文字字体大小，默认为12px
                    },
                    // sublink: 'https://github.com/BlankerL/DXY-2019-nCoV-Data',
                    left: 'center'
                },
                tooltip: {
                    trigger: 'item',
                    formatter: '{b}的病例数: {c}<br/>单击查看详情<br/>单击右上角返回上一级'
                },
                color: ['#d48265', '#2f4554','#c23531','#749f83'],
                legend: {
                    orient: 'vertical',
                    left: 'left',
                    data:['现存确诊','累计确诊','累计治愈','累计死亡'],
                    // selectedMode: 'single',
                    selected: {
                        '累计确诊': false,
                        '累计治愈': false,
                        '累计死亡': false
                    }
                },
                visualMap: {
                    type : 'piecewise',
                    showLabel: true,
                    pieces: [
                        {min: 100, color: "rgb(112,22,29)"}, // 不指定 max，表示 max 为无限大（Infinity）。
                        {min: 50, max: 100, color: 'rgb(203,42,47)'},
                        {min: 25, max: 50, color: 'rgb(229,90,78)'},
                        {min: 10, max: 25, color: 'rgb(245,158,131)'},
                        {min: 1, max: 9, color: 'rgb(253,235,207)'},
                    ],
                    left: 'left',
                    top: 'bottom',
                    // text: ['多','少'],           // 文本，默认为数值文本
                    calculable: true
                },
                toolbox: {
                    show: true,
                    // orient: 'vertical',
                    right: '10%',
                    top: 'top',
                    itemSize: 30,
                    itemGap: 30,
                    feature: {
                        myDrillUp: {
                            show: true,
                            title: '返回上一级',
                            icon: 'image:///images/return.svg',
                            onclick: function (){
                                drill_up()
                            }
                        },
                        saveAsImage: {
                            pixelRatio: 5
                        }
                    }
                },
                series: []
            },
            options: series_data
        };
        $.getJSON('./echarts/map/json/world.json', function (data) {
            echarts.registerMap('world', data);
            // 基于准备好的dom，初始化echarts实例
            // let myChart = echarts.init(document.getElementById('map_world'));
            myChart.setOption(world_option);
            myChart.hideLoading();
            $("#btn-world-map").prop('disabled', false);
        });
    });


}