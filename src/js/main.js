var data = {
    debug: false,
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
        years: []
    }

};
var operations = {
    // methods
    scan: function () {
        var that = this;
        chrome.bookmarks.getTree((marks) => {
            data.bookmarks = that.traverse(marks);
            if (!data.bookmarks.length) {
                progress.done();
            }
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
                id: node.id
                , dateAdded: node.dateAdded
                , url: node.url
                , title: node.title
                , status: 200,
            });

            // Years
            let year = new Date(node.dateAdded).getFullYear();
            if (data.where.years.indexOf(year) === -1) {
                data.where.years.push(year);
            }
        });
        return data.bookmarks;
    },
    remove: function (index) {
        let bookmark = data.bookmarks[index];
        chrome.bookmarks.remove(bookmark.id, () => {
            data.bookmarks.splice(index, 1);
            console.log("记录日志, 删除书签", bookmark);
        });
    },
    _checkUrls: function () {
        data.bookmarks.forEach((bookmark, index) => {
            if (data.debug) {
                let bookmark = data.bookmarks[index];
                bookmark.status = [200, 500, 404, 0, 501][Math.floor(Math.random() * 4)];
                progress.loading(data.count, (data.bookmarks.length - 1));
                if ((data.bookmarks.length - 1) === data.count) { // 全部检查完成
                    progress.done();
                }
                data.count++;
            } else {
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
            }
        });
    },
    where: function () {
        data.where.filter.key = $('#search').val() || '';
        data.where.sort.inverse = $('.sort span.active').data('inverse');
        let status = ($('#status-code').val() || '').split(',');
        if (status.indexOf('') !== -1) {
            status = [];
        }
        data.where.filter.status = status;
        let timeRange = ($('#time-range').val() || '').split(',');
        if (timeRange.indexOf('') !== -1) {
            timeRange = [];
        }
        data.where.filter.timeRange = timeRange;
        ui.list();
    }
};

var progress = {
    start: function () {
        data.bookmarks = [];
        data.where.years = [];
        $('.bookmarks ul').empty();
        $('#clear').hide();
        $('#sort-out').addClass('active')
            .text('扫描中');
    },
    loading: function (v, max) {
        let val = ((v / max) || 0.00).toFixed(2) * 100;
        console.log('扫描中(' + val + '%)');
        $('#sort-out').text('扫描中(' + val + '%)');
    },
    done: function () {
        $('#clear').show();
        ui.draw(data.bookmarks);
        ui.list();
        $('#sort-out').removeClass('active')
            .text('重新扫描');

        // 年份选择器
        if (!!data.where.years.length) {
            $('#range').empty();
            data.where.years.forEach((year, index, arr) => {
                $('#range').append(`<option value="${year}" ${(index + 1) === arr.length ? 'selected' : ''}>${year}</option>`);
            });
        }
    }
};

var ui = {
    draw: function (bookmarks) {
        let preNow = new Date();
        preNow.setFullYear(preNow.getFullYear() - 1);
        myChart.setOption({
            series: [{
                name: '收藏数',
                data: this._cast(bookmarks)
            }],
            calendar: [{
                range: [
                    echarts.format.formatTime('yyyy-MM-dd', preNow),
                    echarts.format.formatTime('yyyy-MM-dd', new Date())
                ]
            }]
        });
    },
    list: function () {
        $('.bookmarks ul').empty();
        let bookmarks = data.bookmarks.filter((bookmark) => { // 状态
            let status = data.where.filter.status;
            return !status.length || status.some((s) => s == bookmark.status);
        }).filter((bookmark) => {
            let timeRange = data.where.filter.timeRange;
            let start = timeRange[0] || 0;
            let end = timeRange[1] || 99999999999999;
            let dateAdded = bookmark.dateAdded;
            return dateAdded >= start && dateAdded <= end;
        }).filter((bookmark) => {
            let key = data.where.filter.key;
            return !key || new RegExp(key).test(bookmark.title);
        }).sort((b1, b2) => {
            if (data.where.sort.inverse) { // 升序
                return b1.dateAdded - b2.dateAdded;
            }
            return b2.dateAdded - b1.dateAdded;
        });
        if (bookmarks.length !== 0) {
            bookmarks.forEach((bookmark, index) => {
                let time = echarts.format.formatTime('yyyy-MM-dd', bookmark.dateAdded);
                let html = `<li class="${(bookmark.status === 404) ? 'remove' : ''}">
                        <sup class="status ${{200: 'success', 404: 'error'}[bookmark.status]}">${bookmark.status}</sup>
                        <i class="icon-bookmark fa fa-bookmark"></i>
                        <span>
                            <a class="bookmark" href="${bookmark.url}" target="_blank" alt="${bookmark.title}">${bookmark.title}</a>
                        </span>
                        <time class="float-right">${time} <i class="icon-trash fa fa-trash-o fa-lg" data-index="${index}"></i></time>
                        
                    </li>`;
                $('.bookmarks ul').append(html);
            });
        }else {
            let html = `
            <p class="tips">囧. 暂无书签</p>
            `;
            $('.bookmarks ul').append(html);
        }
    },
    changeYear: function (year) {
        myChart.setOption({
            calendar: [{
                range: year
            }]
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

window.onload = function () {
    $('#sort-out').on('click', () => {
        progress.start();
        operations.scan();
    });
    $('#clear').on('click', () => {
        if (confirm("确认清理?")) {
            data.bookmarks.filter((bookmark) => {
                return bookmark.status === 404;
            }).map((bookmark, index) => {
                operations.remove(index);
            });
            $('#sort-out').click();
        }
    });
    $(document).on('click', '.bookmarks ul li .icon-trash', (e) => {
        let $that = $(e.target);
        let index = $that.data('index');
        if (confirm('确定删除?')) {
            operations.remove(index)
        }
        $('#sort-out').click();
    });
    $(document).on('change', '#status-code, #time-range', (e) => {
        operations.where();
    }).on('click', '.sort span', (e) => {
        let $that = $(e.target);
        $('.sort span').removeClass('active');
        $that.addClass('active');
        operations.where();
    }).on('keydown', '#search', () => {
        operations.where();
    });
    $(document).on('change', '#range', (e) => {
        let $target = $(e.target);
        let year = $target.val();
        if (!!year) {
            ui.changeYear(year);
        }
    });


    let now = new Date();
    $('#time-range').append(`<option value="${Date.parse(now.getFullYear() + '-' + now.getMonth() + '-' + now.getDay())},${Date.parse(now.getFullYear() + '-' + now.getMonth() + '-' + (now.getDay() + 1))}">今天</option>`)
        .append(`<option value="${Date.parse(now.getFullYear() + '-' + now.getMonth() + '-1')},${Date.parse(now.getFullYear() + '-' + (now.getMonth() + 1) + '-1')}">本月</option>`)
        .append(`<option value="${Date.parse(now.getFullYear() + '-1' + '-1')},${Date.parse((now.getFullYear() + 1) + '-1' + '-1')}">今年</option>`);
};


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
myChart.on('click', (params) => {
    let time = params.data[0];
    let date = new Date(time);
    let now = Date.parse(date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate());
    data.where.filter.timeRange = [
        now,
        now + 3600 * 24 * 1000
    ];
    ui.list();
});
