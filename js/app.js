var app = angular.module('app', ['ui.bootstrap']);

app.factory('lastfm', ['$http', function ($http) {

  var apiKey = '9e421941650f3e6d9058baf8d69d4df9';

  var getTopTags = function () {
    var url = 'http://ws.audioscrobbler.com/2.0/';
    return $http.get(url, {
      params: {
        method: 'chart.gettoptags', 
        api_key: apiKey,
        format:'json'
      }
    });
  };

  var getTopArtists = function (tag) {
    var url = 'http://ws.audioscrobbler.com/2.0/';
    return $http.get(url, {
      params: {
        method: 'tag.gettopartists',
        api_key: apiKey,
        tag: tag,
        format:'json'
      }
    });
  };

  return {
    topTags: function () { return getTopTags() },
    topArtists: function (tag) { return getTopArtists(tag) }
  };
}]);

app.controller('lastfmCtrl', ['$scope','lastfm', function ($scope, lastfm) {
  $scope.tagsize = 'reach';
  $scope.toptags = [];
  $scope.artists = [];

  lastfm.topTags()
    .success(function (res) {
      if (res.error) {
        throw new Error(res.message);
      } else {
        $scope.toptags = res.tags.tag.map(function (t) {
          t.reach    = +t.reach;
          t.taggings = +t.taggings;
          return t;
        });

        lastfm.topArtists($scope.toptags[0].name)
          .success(function (res) {
            if (res.error) {
              throw new Error(res.message);
            } else {
              $scope.artists = res.topartists.artist.map(function (a) {
                a.genre = $scope.toptags[0].name;
                a.arank = +a['@attr'].rank;
                return a;
              });
            }
          });
      }
    });
}]);

app.directive('toptagChart', ['lastfm', function (lastfm) {

  var link = function (scope, el, attrs) {
    var diameter = 500;
    var color = d3.scale.ordinal().range(['#58625C','#4C5355','#89817A','#36211C','#A5A9AA']);

    var bubble = d3.layout.pack()
      .sort(null)
      .size([diameter, diameter])
      .padding(2.5);

    var svg = d3.select(el[0])
      .append("svg")
        .attr("width", diameter)
        .attr("height", diameter)
        .attr("class", "bubbleChart");

    var update = function () {
      var data = scope.toptags.map(function (d) {
        d.value = d[scope.tagsize];
        return d;
      });

      var selection = svg.selectAll(".node")
        .data(bubble.nodes({children: data})
        .filter(function (d) { return !d.children; }), function (d) { return d.name; });

      var enter = selection.enter()
        .append("g")
          .attr("class", "node")
          .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });

      enter.append("title")
        .text(function (d) { return d.name; });

      enter.append("circle")
        .attr("r", function (d) { return d.r; })
        .style("fill", function (d) { return color(d.name); })
        .on("click", function (d) {
          lastfm.topArtists(d.name)
            .success(function (res) {
              if (res.error) {
                throw new Error(res.message);
              } else {
                var artists = res.topartists.artist.map(function (a) {
                  a.genre = d.name;
                  a.arank = +a['@attr'].rank;
                  return a;
                });
                scope.artists = artists;
                console.log("artists", artists);
              }
            });
        });

      enter.append("text")
        .attr("dy", ".3em")
        .style("text-anchor", "middle")
        .text(function (d) { return d.name.substring(0, d.r / 3); });

      selection.transition().duration(2000)
        .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });

      selection.selectAll("circle").transition().duration(3500)
        .attr("r", function (d) { return d.r; });
    };

    scope.$watch('tagsize', function () {
      if (scope.toptags.length > 0) {
        update();
      }
    });

    scope.$watch('toptags', function () {
      if (scope.toptags.length > 0) {
        update();
      }
    });
  };
  return { link: link, restrict: 'E' };
}]);

app.directive('artistsChart', function () {

  var link = function (scope, el, attrs) {
    var msize = [400, 500], radius = 20;
    var color = d3.scale.ordinal().range(['#58625C','#4C5355','#89817A','#36211C','#A5A9AA']);

    var svg = d3.select(el[0])
      .append("svg")
        .attr("width", msize[0])
        .attr("height", msize[1])
        .attr("class", "bubbleChart");

    var coords = function (position) {
      var x, y;
      x = ((position - 1) % 5) * 75;
      y = (Math.ceil(position / 5)) * 45;
      return {x: x, y: y};
    }

    var transform = function (d) {
      var c = coords(d.arank);
      return "translate(" + (c.x + radius + 25) + "," + c.y + ")"; 
    };

    var update = function () {
      var data = scope.artists.map(function (d) {
        d.value = 10;
        return d;
      });

      var selection = svg.selectAll(".node")
        .data(data, function (d) { return d.name; });

      var enter = selection.enter()
        .append("g")
          .attr("class", "node")
          .attr("transform", transform); 

      enter.append("circle")
        .attr("r", 5)
        .style("fill", function (d) { return color(d.name); })

      enter.append("text")
        .attr("dy", ".3em")
        .style("text-anchor", "middle")
        .text(function (d) { return d.name.slice(0,15); });

      selection.transition().duration(3000)
        .attr("transform", transform);

      selection.selectAll("circle")
        .transition().duration(2500)
        .attr("r", radius);

      var exit = selection.exit()
      exit.transition().duration(1000)
      .attr("transform", function (d) {
        return "translate(" + 1000 + "," + 1000 + ")"; 
      }).remove();
    };

    scope.$watch('artists', function () {
      if (scope.artists.length > 0) {
        update();
      }
    });
  };
  return { link: link, restrict: 'E' };
});