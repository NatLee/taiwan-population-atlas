# -*- coding: utf8 -*-

from urllib.request import urlopen
from urllib.request import Request
from optparse import OptionParser
from bs4 import BeautifulSoup
import sys

year=1997
yearEnd=2015
# 開始
for i in range(year,yearEnd+1):
    url="https://zh.m.wikipedia.org/wiki/"+str(year)+"%E5%B9%B4%E8%87%BA%E7%81%A3"
    f = open(str(year)+'.txt', encoding = 'utf8', mode='w')
    if url is not None:
        # 設置假的瀏覽器資訊
        headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Safari/537.36'}
        # 發送請求
        req = Request(url=url, headers=headers)
        page = urlopen(req)
        content = page.read().decode('utf-8')
        # 進行分割
        soup = BeautifulSoup(content, 'lxml')
        matches = soup.find_all('div', 'mf-section-2')
        # 將資訊顯示出來
        for key in range(len(matches)):
            #print(matches[key].get_text())
            f.write(matches[key].get_text())
        f.close()
