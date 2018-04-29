// chrome.browserAction.onClicked.addListener(function(tab) {
//     console.log(tab);
// });
var lineChart = document.getElementById('line-chart').getContext('2d');
var pieChart = document.getElementById('pie-chart').getContext('2d');
var chart = new Chart(lineChart, {
    // The type of chart we want to create
    type: 'line',

    // The data for our dataset
    data: {
        labels: ["January", "February", "March", "April", "May", "June", "July"],
        datasets: [{
            label: "书签与时间",
            backgroundColor: 'rgb(255, 99, 132)',
            borderColor: 'rgb(255, 99, 132)',
            data: [0, 10, 5, 2, 20, 30, 45]
        }]
    },

    // Configuration options go here
    options: {
        scales: {
            yAxes: [{
                ticks: {
                    beginAtZero:true
                }
            }]
        }
    }
});