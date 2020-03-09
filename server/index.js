var express=require('express')
var fs=require('fs')
var path=require('path')

var app=express()


app.get('/api/data',(req,res)=>{
    res.setHeader('Access-Control-Allow-Origin', '*')//最简单的设置跨域
    fs.readFile(path.join(__dirname,'./data.json'),'utf-8',(err,data)=>{
        if(err) throw err 
        console.log(data);
        res.send(data)
    })
})
app.listen(3000,()=>{
    console.log('服务器启动');
    
})