//目标是什么??爬取丁香园网站的疫情数据
//https://ncov.dxy.cn/ncovh5/view/pneumonia
//在node端要有一个帮助我请求网站的
const superagent=require('superagent')
const cheerio=require('cheerio')
const fs=require('fs')
const path=require('path')
const url='https://ncov.dxy.cn/ncovh5/view/pneumonia'
// const url2='https://github.com/BlankerL/DXY-COVID-19-Crawler/blob/master/service/crawler.py'
superagent
    .get(url)
    .then(res=>{
        // console.log(res.text);//响应的内容
        //2.通过cheerio筛选获取的数据
        const $=cheerio.load(res.text) //然后我们就可以通过jquery操作dom
        var $getListByCountryTypeService1=$('#getListByCountryTypeService1').html()
        // console.log($getListByCountryTypeService1);
        var dataObj={}
        eval($getListByCountryTypeService1.replace(/window/g,'dataObj'))
        console.log(dataObj);
        //3.fs写入数据到本地
        fs.writeFile(path.join(__dirname,'./data.json'),JSON.stringify(dataObj),err=>{
            if(err) throw err 
            console.log('数据写入成功');
            
        })
        
    })
    .catch(err=>{
        throw err
    })
