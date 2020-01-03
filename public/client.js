// Documentation
// Codes:
// {code: 0, description: "Not started", type: "notstarted"}
// {code: 13, description: "1st quarter", type: "inprogress"}
// {code: 14, description: "2nd quarter", type: "inprogress"}
// {code: 30, description: "Break", type: "inprogress"}
// {code: 100, description: "Ended", type: "finished"}

// client-side js
document.addEventListener("DOMContentLoaded", function(event) {
  const today = new Date();
  document.getElementById("dateEvents").value = today.getFullYear() + "-" + ("0" + (today.getMonth() + 1)).slice(-2) + "-" + ("0" + today.getDate()).slice(-2);
  startup();
});

function startup() {
  document.getElementById("loaderNode").classList.add("show");
  document.querySelectorAll("#table_info_matches tbody")[0].innerHTML = "";
  const dateEvent = document.getElementById("dateEvents").value; // Example: "2019-12-30";
  const api_url = "https://www.sofascore.com/basketball//";

  const url = "https://www.sofascore.com/basketball//" + dateEvent + "/json";
  fetch(url)
    .then(response => response.json())
    .then(results => {
      console.log(results.sportItem.tournaments);
      var promises = [];
      if (results.sportItem && results.sportItem.tournaments) {
        var promises = getPromises(results.sportItem.tournaments);
        Promise.all(promises).then(function(promisesData) {
          document.getElementById("loaderNode").classList.remove("show");
          var resultsObj = {};
          promisesData.forEach(function(elem) {
            if (!resultsObj[elem.sportEventId]) {
              resultsObj[elem.sportEventId] = {
                event: {},
                markets: {}
              };
            }
            if (elem && elem.result) {
              if (elem.result.event) {
                resultsObj[elem.sportEventId].event = elem.result.event;
              } else if (elem.result.markets) {
                resultsObj[elem.sportEventId].markets = elem.result.markets;
              }
            }
          });
          var matchesArray = createMatchesArray(resultsObj);
          checkResults(matchesArray);
        });
      }
    });
}

function createMatchesArray(results) {
  var matchesArray = [];
  for (var key in results) {
    if (results.hasOwnProperty(key)) {
      var obj = {
        eventId: results[key].event.id,
        eventDate: new Date(
          results[key].event.startTimestamp * 1000
        ).toLocaleString(),
        homeTeamName: results[key].event.homeTeam.name,
        awayTeamName: results[key].event.awayTeam.name,
        currentHomeScore: results[key].event.homeScore.current || "",
        currentAwayScore: results[key].event.awayScore.current || "",
        status: results[key].event.status,
        markets: {
          pre: {},
          live: {}
        }
      };
      results[key].markets.forEach(function(market) {
        if (market.marketId === 1 || market.marketName === "Full time") {
          market.choices.forEach(function(choice) {
            var evalFractionValue;
            try {
              evalFractionValue = eval(choice.fractionalValue);
            } catch (e) {
              console.error("Error en valor de cuota", e);
              evalFractionValue = 0;
            }
            var decimalValue = (evalFractionValue + 1).toFixed(2);
            if (market.isLive) {
              obj.markets.live[choice.name] = decimalValue;
            } else {
              obj.markets.pre[choice.name] = decimalValue;
            }
          });
        }
      });
      matchesArray.push(obj);
    }
  }
  return matchesArray;
}

function obtainMatches(sportEventId) {
  var api_url = "https://api.sofascore.com/api/v1/event/";

  var ajaxGeneral = fetch(api_url + sportEventId + "?_=" + new Date().getTime())
    .then(response => response.json())
    .then(r => {
      return {
        sportEventId: sportEventId,
        result: r
      };
    });

  var ajaxCuotas = fetch(api_url + sportEventId + "/odds/1/all?_=" + new Date().getTime())
    .then(response => response.json())
    .then(r => {
      return {
        sportEventId: sportEventId,
        result: r
      };
    });

  return [ajaxGeneral, ajaxCuotas];
}

function getPromises(tournaments) {
  var promises = [];

  var arrayFilter = []
  var checkboxes = document.querySelectorAll("input[name='statusSelector']:checked")
  for (var i = 0; i < checkboxes.length; i++) {
    arrayFilter.push(checkboxes[i].value)
  }
  console.log(arrayFilter);

  
  tournaments.forEach(function(tournament) {
    tournament.events.forEach(function(evt) {
      arrayFilter.forEach(filterType => {
        if (evt.status.type === filterType) {
            promises = promises.concat(obtainMatches(evt.id));
        }
      });
    });
  });
  return promises;
}

function checkResults(matchesArray) {
  matchesArray.sort(function(a, b) {
    return b.status.code - a.status.code;
  });
  
  matchesArray.forEach(function(elem) {
    var tr = document.createElement("tr");
    
    var td = document.createElement("td");
    td.appendChild(document.createTextNode(elem.status.description));
    tr.appendChild(td);
    
    var td = document.createElement("td");
    td.appendChild(document.createTextNode(elem.homeTeamName + " vs " + elem.awayTeamName));
    tr.appendChild(td);
    
    td = document.createElement("td");
    td.appendChild(document.createTextNode(elem.eventDate));
    tr.appendChild(td);
    
    td = document.createElement("td");
    td.appendChild(document.createTextNode(elem.eventId));
    tr.appendChild(td);

    td = document.createElement("td");
    td.appendChild(document.createTextNode(elem.currentHomeScore + " - " + elem.currentAwayScore));
    tr.appendChild(td);

    td = document.createElement("td");
    var textToShow = "";
    for (var key in elem.markets.pre) {
      if (elem.markets.pre.hasOwnProperty(key)) {
        textToShow += key + " - " + elem.markets.pre[key] + "    ";
      }
    }
    td.appendChild(document.createTextNode(textToShow));
    tr.appendChild(td);

    td = document.createElement("td");
    textToShow = "";
    for (var key in elem.markets.live) {
      if (elem.markets.live.hasOwnProperty(key)) {
        textToShow += key + " - " + elem.markets.live[key] + "    ";
      }
    }
    td.appendChild(document.createTextNode(textToShow));
    tr.appendChild(td);

    showNotification(elem, tr);
    document.querySelectorAll("#table_info_matches tbody")[0].appendChild(tr);
  });
  
  function showNotification(rowData, row) {    
    const oddLive = Number(document.getElementById("oddLive").value);
    const oddPre = Number(document.getElementById("oddPre").value);
    
    var preObjective = null;
    var preFeeCondition = false;
    var liveFeeCondition = false;
    
    // PRE markets
    for (var key in rowData.markets.pre) {
      if (rowData.markets.pre.hasOwnProperty(key)) {
        if (rowData.markets.pre[key] <= oddPre) {
          preObjective = key;
          preFeeCondition = true;
        }
      }
    }
    
    // LIVE markets
    for (var key in rowData.markets.live) {
      if (rowData.markets.live.hasOwnProperty(key)) {
        if (rowData.markets.live[preObjective] >= oddLive) {
          liveFeeCondition = true;
        }
      }
    }
    
    console.log(preFeeCondition, liveFeeCondition);
    
    if (preFeeCondition && liveFeeCondition) {
      row.classList.add("table-danger");
    }
  }
}
