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
  $scope.size = 'reach';
  $scope.tags = [];
  $scope.dynamicPopover = 'Hello, World!';
  $scope.dynamicPopoverTitle = 'Title';
  $scope.artists = [];

  lastfm.topArtists()
    .success(function (res) {
      if (res.error) {
        throw new Error(res.message);
      } else {
        var tags = res.tags.tag.map(function (d) {
          d.reach    = +d.reach;
          d.taggings = +d.taggings;
          return d;
        });
        $scope.tags = tags;
      }
    });

  // lastfm.topTags()
  //   .success(function (res) {
  //     if (res.error) {
  //       throw new Error(res.message);
  //     } else {
  //       var tags = res.tags.tag.map(function (d) {
  //         d.reach    = +d.reach;
  //         d.taggings = +d.taggings;
  //         return d;
  //       });
  //       $scope.tags = tags;
  //     }
  //   });
}]);

app.directive('bubbleChart', function(){

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
      var data = scope[attrs.dataset].map(function (d) {
        d.value = d[scope[attrs.view]];
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
        .style("fill", function (d) { return color(d.name); });

      enter.append("text")
        .attr("dy", ".3em")
        .style("text-anchor", "middle")
        .text(function (d) { return d.name.substring(0, d.r / 3); });

      selection.transition().duration(2000)
        .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });

      selection.selectAll("circle").transition().duration(3500)
        .attr("r", function (d) { return d.r; });
    };

    scope.$watch(attrs.view, function () {
      if (scope.tags.length > 0) {
        update();
      }
    });

    scope.$watch(attrs.dataset, function () {
      if (scope.tags.length > 0) {
        update();
      }
    });
  };
  return { link: link, restrict: 'E' };
});
