/*
 * Elasticsearch CSV Exporter
 * v0.1
 * https://github.com/minewhat/es-csv-exporter
 * MIT licensed
 *
 * Copyright (c) 2014-2015 MineWhat,Inc
 *
 * Credits: This extension is created using Extensionizr , github.com/uzairfarooq/arrive
 */
chrome.extension.sendMessage({}, function(response) {
  var readyStateCheckInterval = setInterval(function() {
  if (document.readyState === "complete") {
    clearInterval(readyStateCheckInterval);

    var url = window.location.href;
    if(url.indexOf("app/kibana") >= 0  || url.indexOf("#/discover") >= 0 || url.indexOf(":5601") >= 0){

      var options = {
        fireOnAttributesModification: true,  // Defaults to false. Setting it to true would make arrive event fire on existing elements which start to satisfy selector after some modification in DOM attributes (an arrive event won't fire twice for a single element even if the option is true). If false, it'd only fire for newly created elements.
        onceOnly: false,                     // Defaults to false. Setting it to true would ensure that registered callbacks fire only once. No need to unbind the event if the attribute is set to true, it'll automatically unbind after firing once.
        existing: true                       // Defaults to false. Setting it to true would ensure that the registered callback is fired for the elements that already exists in the DOM and match the selector. If options.onceOnly is set, the callback is only called once with the first element matching the selector.
      };

      document.arrive(".kuiLocalMenu",options, function() {
        var alreadyExists = document.getElementById("elastic-csv-exporter");
        if(!alreadyExists)
          injectCSVExportButton();
      });

      chrome.runtime.sendMessage({"msg": "badge", data: true}, function(){});

    }else{
      //We are in some other page. Just exit.
      chrome.runtime.sendMessage({"msg": "badge", data: false}, function(){});
      return;
    }
  }
  }, 10);
});

function setAttributes(el, attrs) {
  for(var key in attrs) {
    el.setAttribute(key, attrs[key]);
  }
}

function parseTable(){
  var csv = "";
  var tbls = document.getElementsByTagName("table");
  for (var i = 0; i < tbls.length; i++) {
    var tbl = tbls.item(i);
    var h = tbl.innerHTML + "";

    //Replace comma with colon
    h = h.replace(/,/g, ";");

    //Remove multiple-whitespaces with one
    h = h.replace(/\s+/g, ' ');

    //Convert all tag word characters to lower case
    h = h.replace(/<\/*\w+/g, function (s) {
      return s.toLowerCase();
    });

    //special cases
    h = h.replace(/<tr><\/tr>/g, "");

    //Convert the table tags to commas and white spaces
    h = h.replace(/<\/tr>/g, "\n");
    h = h.replace(/<\/td>/g, ",");
    h = h.replace(/<\/th>/g, ",");
    h = h.replace(/( )?<.+?>( )?/g, "");

    h = h.replace(/,\n/g, "\n");
    h = h.replace(/\n,/g, "\n");

    h = h.replace(/^\s+/g, "");
    h = h.replace(/^,/g, '');
    csv += h;
  }
  return csv;
}

function parseAndCopyToClipBoard(){
 var csv = parseTable();
  chrome.runtime.sendMessage({"msg": "store-csv", data: csv}, function(response) {
    console.log("CSV Export:", response.status);
  });
}

function parseAndSaveAsFile(){
  var csv = parseTable();
   chrome.runtime.sendMessage({"msg": "save-csv", data: csv}, function(response) {
     console.log("CSV Saved:", response.status);
   });
 }

function createElement(type, attributes, innerHTML){
  var elem = document.createElement(type);

  if(attributes)
    setAttributes(elem, attributes);

  if(innerHTML)
    elem.innerHTML = innerHTML;

  return elem;
}

function createCSVButton(){
  var csvInnerHTML = 'Export';
  var csvElemAttributes = {"tooltip":"Export CSV", "tooltip-placement":"bottom", "aria-label":"Export","aria-expanded":"false","aria-disabled":"false","tooltip-popup-delay":"400", "tooltip-append-to-body":"1", "text":"Export CSV", "placement":"bottom", "append-to-body":"1", "class":"kuiLocalMenuItem", "id":"elastic-csv-exporter"};
  var csvButton = createElement('button', csvElemAttributes, csvInnerHTML);
  csvButton.onclick = function(){
    injectMessageSlider();
  };
  return csvButton;
}


function createMessageSlider(){
  var wrapperDiv = createElement('div', {"style": "padding:10px 5px; background-color:#e6f0f8; width:100% !important;", "id":"csv-message-wrapper"});
  var messageBox = createElement('div', {"style": "margin-left: 30%", "id":"csv-message-box"});
  wrapperDiv.appendChild(messageBox);

  var successText = "CSV Exporter: This will export/save only the visible query results. Export to";
  var failureText = "Oops, CSV export failed.";
  messageBox.appendChild(createElement('span',null,successText));

  var copyToClipboardHTML = '<button title="Copy to clipboard" aria-expanded="true" aria-label="Copy to clipboard" style="margin-left: 5px;"><p style="margin: 0;margin-right: 5px;color: #005570;font-size: 12px;font-weight:bold;">Clipboard</p></button>';
  var copyToClipboard = createElement('span', {"title":"Copy to clipboard"}, copyToClipboardHTML);
  copyToClipboard.onclick = function(){
    parseAndCopyToClipBoard();
  };
  messageBox.appendChild(copyToClipboard);
  messageBox.appendChild(createElement('span', null,"or"));
  var saveAsFileHTML = '<button title="Save as File" aria-expanded="true" aria-label="Save as File" style="margin-left: 0px;"><p style="margin: 0;margin-left: 5px;color: #005570;font-size: 12px;font-weight:bold;">File</p></button>';
  var saveAsFile = createElement('span', {"title":"Save as File"}, saveAsFileHTML);
  saveAsFile.onclick = function() {
    parseAndSaveAsFile();
  };
  messageBox.appendChild(saveAsFile);

  var CloseHTML = '<button aria-expanded="true" aria-label="Close export slider"><p style="margin: 0;margin-left: 5px;font-size: 12px;color: #f44336;font-weight: bold;">X</p></button>';
  var close = createElement('span', {"title":"Close export slider"}, CloseHTML);
  close.onclick = function(){
   closeMessageSlider();
  };
  messageBox.appendChild(close);

  return wrapperDiv;
}


function closeMessageSlider(){
  var nav = getMessageSliderElement();
  var wrapperDiv = document.getElementById("csv-message-wrapper");

  if(nav && wrapperDiv)
    nav.removeChild(wrapperDiv);
}

function injectMessageSlider(){
  closeMessageSlider();
  var div = createMessageSlider();
  var nav = getMessageSliderElement();
  if(nav) {
    nav.appendChild(div);
    setTimeout(function(){ closeMessageSlider(); }, 10000);
  }
}

function getMessageSliderElement(){
  var nav = document.getElementsByTagName("navbar")[0];
  if(!nav) {
    nav = document.getElementsByClassName("kuiLocalNav")[0];
  }
  return nav;
}


function injectCSVExportButton() {
  var navbar = document.getElementsByTagName("navbar")[0];
  var menubar = document.getElementsByClassName("kuiLocalMenu");
  var buttonGroup, menuType;
  if(navbar) {
    buttonGroup = navbar.getElementsByClassName("button-group")[0];
  } else if (menubar.length == 2) {
    buttonGroup = menubar[1];
  } else if (menubar.length == 1) {
    buttonGroup = menubar[0];
  } else {
    buttonGroup = document.getElementsByClassName("kuiLocalBreadcrumbs")[0];
  }

  if(buttonGroup) {
    var span = createCSVButton();
    if (menubar.length == 2) {
      buttonGroup.insertAdjacentElement('beforeBegin', span)
    } else if (menubar.length == 1) {
      buttonGroup.insertBefore(span, buttonGroup.firstChild);
    }
    else {
      buttonGroup.appendChild(span);
    }
  }
}
