var data = {
    /**
     * {
     *  "dateAdded": 收藏时间，
     *  "url": 书签URL，
     *  "title": 书签标题，
     *  "status": 200
     * }
     */
    bookmarks: []
    , count: 0


    , where: {
        filter: {
            status: []
            , key: ''
            , timeRange: []
        },
        sort: {
            inverse: false
        },
        year: 2018
    }

};
var operations = {
    // methods
    scan: function () {
        var that = this;
        chrome.bookmarks.getTree((marks) => {
            data.bookmarks = that.traverse(marks);
            data.count = 0;
            that._checkUrls();
        });
    },
    traverse: function (nodes) {
        nodes.filter((node) => {
            if (!!node["children"]
                && !!node["children"].length) { // 文件夹
                this.traverse(node["children"]);
                return false;
            }
            return true;
        }).filter(
            (node) => !!node["url"]
        ).map((node) => {
            data.bookmarks.push({
                dateAdded: node["dateAdded"]
                , url: node["url"]
                , title: node["title"]
                , status: 200,
            });
        });
        return data.bookmarks;
    },
    _checkUrls: function () {
        data.bookmarks.forEach((bookmark, index) => {
            $.ajax({
                type: "GET",
                cache: false,
                timeout: 5000,
                async: true,
                url: bookmark.url,
                complete: (response) => {
                    if (response.status !== 200) {
                        let bookmark = data.bookmarks[index];
                        bookmark.status = response.status;
                    }
                    progress.loading(data.count, (data.bookmarks.length - 1));
                    if ((data.bookmarks.length - 1) === data.count) { // 全部检查完成
                        progress.done();
                    }
                    data.count++;
                }
            });
        });
    }
};

var progress = {
    start: function () {
        $('#sort-out').addClass('active')
            .text('扫描中');
    },
    loading: function (v, max) {
        ui.draw();
        let val = ((v / max) || 0.00).toFixed(2) * 100;
        console.log('扫描中(' + val + '%)');
        $('#sort-out').text('扫描中(' + val + '%)');
    },
    done: function () {
        ui.list();
        $('#sort-out').removeClass('active')
            .text('重新扫描');
    }
};

var ui = {
    draw: function () {
        myChart.setOption({
            series: [{
                name: '收藏数',
                data: this._cast(data.bookmarks)
            }]
        });
    },
    list: function () {
        $('.bookmarks ul').empty();
        let bookmarks = data.bookmarks.filter((bookmark) => { // 状态
            let status = data.where.filter.status;
            return !status.length || status.some((s) => s === bookmark.status);
        }).filter((bookmark) => {
            let timeRange = data.where.filter.timeRange;
            let start = timeRange[0] || 0;
            let end = timeRange[1] || 99999999999999;
            console.log(bookmark.dateAdded);
            return bookmark.dateAdded >= start && bookmark.dateAdded <= end;
        }).filter((bookmark) => {
            let key = data.where.filter.key;
            return !key || new RegExp(key).test(bookmark.title);
        }).sort((b1, b2) => {
            if (data.where.sort.inverse) { // 升序
                return b1.dateAdded - b2.dateAdded;
            }
            return b2.dateAdded - b1.dateAdded;
        });
        bookmarks.forEach((bookmark) => {
            let time = echarts.format.formatTime('yyyy-MM-dd', bookmark.dateAdded);
            let html = `<li class="${(bookmark.status === 404) ? 'remove' : ''}">
                        <i class="icon fa fa-bookmark"></i>
                        <span>
                            <a class="bookmark" href="${bookmark.url}" target="_blank" alt="${bookmark.title}">${bookmark.title}</a>
                            <sup class="status ${{200: 'success', 404: 'error'}[bookmark.status]}">${bookmark.status}</sup>
                        </span>
                        <time class="float-right">${time}</time>
                    </li>`;
            $('.bookmarks ul').append(html);
        });

    },
    /**
     * 转化数据格式
     * @param dataes
     * @private
     */
    _cast: function (dataes) {
        let map = new Map();
        dataes.forEach((data) => {
            let time = echarts.format.formatTime('yyyy-MM-dd', data.dateAdded);
            let count = map.get(time) || 0;
            map.set(time, count + 1);
        });
        let ret = [];
        map.forEach((val, key) => {
            ret.push([
                key, val
            ]);
        });
        return ret;
    }
};

(() => {
    $('#sort-out').on('click', function () {
        progress.start();
        operations.scan();
    });
})();


var myChart = echarts.init($('#container')[0]);

option = {
    backgroundColor: '#fafafa',
    title: {
        top: 20,
        text: '收藏时间',
        left: 'center',
        textStyle: {
            color: '#000'
        }
    },
    tooltip: {
        trigger: 'item'
    },
    visualMap: {
        min: 0,
        max: 10,
        calculable: true,
        orient: 'vertical',
        show: false,
        borderColor: '#fff',
        borderWidth: 10
    },
    legend: {
        top: '30',
        left: '100',
        data: ['收藏数'],
        textStyle: {
            color: '#000'
        }
    },
    calendar: [{
        top: 'center',
        cellSize: [12, 12],
        range: 2018,
        left: 'center'
    }],
    series: [{
        name: "收藏数",
        type: 'heatmap',
        coordinateSystem: 'calendar',
        data: []
    }]
};
myChart.setOption(option);
