// let changeColor = document.getElementById('changeColor');

// chrome.storage.sync.get('color', function (data) {
//     changeColor.style.backgroundColor = data.color;
//     changeColor.setAttribute('value', data.color);
// });

// changeColor.onclick = function (element) {
//     let color = element.target.value;
//     chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
//         chrome.tabs.executeScript(
//             tabs[0].id,
//             { code: 'document.body.style.backgroundColor = "' + color + '";' });
//     });
// };

let log = console.log;

var start_from_idx = document.getElementById("start_from_idx");
var start_from_url = document.getElementById("start_from_url");
var submit_button = document.getElementById("submit");

var port = chrome.runtime.connect({ name: "auto_download_resources_extension" });
submit_button.addEventListener("click", function () {
    if (submit_button.value === "开始抓取") {
        port.postMessage({
            cmd: "download",
            from: start_from_idx.value,
            from_url: start_from_url.value
        })
        submit_button.value = "结束"
    } else if (submit_button.value === "结束") {
        port.postMessage({
            cmd: "stop"
        })
        submit_button.value = "开始抓取"
    }
});
