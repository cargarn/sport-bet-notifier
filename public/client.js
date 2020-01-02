// client-side js
document.addEventListener("DOMContentLoaded", function(event) {
  var today = new Date();
  document.getElementById("dateEvents").value =
    today.getFullYear() +
    "-" +
    ("0" + (today.getMonth() + 1)).slice(-2) +
    "-" +
    ("0" + today.getDate()).slice(-2);
});

function getAllMatches() {
  document.querySelectorAll("#table_info_matches tbody")[0].innerHTML = "";
  var dateEvent = document.getElementById("dateEvents").value; // Example: "2019-12-30";
  var api_url = "https://www.sofascore.com/basketball//";

  const proxyurl = "https://cors-anywhere.herokuapp.com/";
  const url = "https://www.sofascore.com/basketball//" + dateEvent + "/json"; // site that doesn’t send Access-Control-*
  fetch(url, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Origin, Content-Type, X-Auth-Token"
    }
  }) // https://cors-anywhere.herokuapp.com/https://example.com
    .then(response => response.json())
    .then(results => {
      console.log(results.sportItem.tournaments);
      var promises = [];
      if (results.sportItem && results.sportItem.tournaments) {
        results.sportItem.tournaments.forEach(function(tournament) {
          tournament.events.forEach(function(evt) {
            promises = promises.concat(obtainMatches(evt.id));
          });
        });
        $.when.apply($, promises).done(function() {
          var resultsObj = {};
          $.each(arguments, function(i, elem) {
            if (!resultsObj[elem[0].sportEventId]) {
              resultsObj[elem[0].sportEventId] = {
                event: {},
                markets: {}
              };
            }
            if (elem[0].event) {
              resultsObj[elem[0].sportEventId].event = elem[0].event;
            } else if (elem[0].markets) {
              resultsObj[elem[0].sportEventId].markets = elem[0].markets;
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
  $.each(results, function(i, elem) {
    var obj = {
      eventId: elem.event.id,
      eventDate: new Date(elem.event.startTimestamp * 1000).toLocaleDateString(
        "es-ES"
      ),
      homeTeamName: elem.event.homeTeam.name,
      awayTeamName: elem.event.awayTeam.name,
      currentHomeScore: elem.event.homeScore.current || "",
      currentAwayScore: elem.event.awayScore.current || "",
      markets: {
        pre: {},
        live: {}
      }
    };
    elem.markets.forEach(function(market) {
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
  });
  return matchesArray;
}

function obtainMatches(sportEventId) {
  var api_url = "https://api.sofascore.com/api/v1/event/";

  var ajaxGeneral = $.ajax({
    dataType: "json",
    url: api_url + sportEventId,
    async: true,
    cache: false,
    success: function(result) {
      result.sportEventId = sportEventId;
    }
  });

  var ajaxCuotas = $.ajax({
    dataType: "json",
    url: api_url + sportEventId + "/odds/1/all?",
    async: true,
    cache: false,
    success: function(result) {
      result.sportEventId = sportEventId;
    }
  });

  return [ajaxGeneral, ajaxCuotas];
}

function checkResults(matchesArray) {
  matchesArray.forEach(function(elem) {
    var row = $("<tr>");
    var textToShow =
      "<td>" + elem.homeTeamName + " vs " + elem.awayTeamName + "</td>";
    textToShow += "<td>" + elem.eventDate + "</td>";
    textToShow +=
      "<td>" + elem.currentHomeScore + " - " + elem.currentAwayScore + "</td>";

    textToShow += "<td>";
    $.each(elem.markets.pre, function(i, fee) {
      textToShow += i + " - " + fee + "    ";
    });
    textToShow += "</td>";

    textToShow += "<td>";
    $.each(elem.markets.live, function(i, fee) {
      textToShow += i + " - " + fee + "    ";
    });
    textToShow += "</td>";

    row.append(textToShow);
    if (oddPre <= 1.1 && oddLive >= 1.35) {
      row.addClass("table-danger");
    }
    $("#table_info_matches tbody").append(row);

    /*elem.markets.forEach(function(market) {
			if (market.marketId === 1 || market.marketName === "Full time") {
				var oddLive = Number($("#oddLive").val());
				var oddPre = Number($("#oddPre").val());
				textToShow = "<td>";
				market.choices.forEach(function(choice) {
					var decimalValue = (eval(choice.fractionalValue) + 1).toFixed(2);
					textToShow += choice.name + " - " + decimalValue + "    ";
				});
				textToShow += "</td>";
				row.append(textToShow);
				if (oddPre <= 1.10 && oddLive >= 1.35) {
					row.addClass("table-danger");
				}
			}
		});
		$("#table_info_matches tbody").append(row);*/
  });
}
