##  全局安装xl_mock
<code>
npm install -g xl_mock
</code>

##  任意目录开启一个mock服务器
<code>
xl_mock start -p 3033
</code>

##  当前目录就是存放mock数据的位置

####  添加类型
string  
number  
object  
boolean  
array[string]  
array[number]  
array[object]  
array[boolean]  

####  数据通过mock.js 实现，支持在类型中传入规则
######  string字符串规则(规则项填入)
date -- 返回日期  
time ---  返回时间  
datetime --- 返回时间和日期  
7,10  --- 返回7到10个字符串
######  number规则
1,100,integer  --- 1到100里面的整数
1,100,float --- 1到100里面的浮点数
######   array[number]规则
2 -- 返回数组长度为2
######   array[string]规则
10,3,5  -- 返回长度为10，字符串长度为3到5的数组





