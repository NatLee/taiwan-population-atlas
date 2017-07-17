
import json

key=['其他','花蓮','南投','臺東','高雄','屏東','臺中','臺南','宜蘭','新北市','嘉義縣','苗栗','新竹縣','雲林','桃園','彰化','臺北市','金門','基隆市','澎湖','新竹市','嘉義市','連江']
key2=['其他','花蓮縣','南投縣','臺東縣','高雄市','屏東縣','臺中市','臺南市','宜蘭縣','新北市','嘉義縣','苗栗縣','新竹縣','雲林縣','桃園市','彰化縣','臺北市','金門縣','基隆市','澎湖縣','新竹市','嘉義市','連江縣']
lines=[]

data={}

json_data=json.dumps({})
for i in range(1997,2015+1):
    with open(str(i)+'.txt',mode = 'r',encoding = 'utf8') as f:
        lines = [line.rstrip('\n') for line in f]
    for num in range(1,12+1):
        temp=str(i)+'年'+str(num)+'月'
        data[temp]={}
        for town in range(len(key2)):
            data[temp][key2[town]]=[]


    for j in range(len(lines)):
        month=lines[j].split('月')[0]
        year_month=str(i)+'年'+str(month)+'月'
        check=0
        for k in range(len(key)):
            if lines[j].find(key[k])>=0:
                check=1
                data[year_month][key2[k]].append(lines[j])
                #data[year_month]={key2[k]:lines[j]}
        if check==0:
            data[year_month]['其他'].append(lines[j])
    #f=open(str(i)+'txt',mode = 'r',encoding = 'utf8')
    lines=[]
    f.close()

newFile=open('BigNews.txt',encoding='utf8', mode='w')
newFile.write(str(data))
newFile.close()
