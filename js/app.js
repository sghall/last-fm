var viz = angular.module('viz', []);

viz.factory('lastfm', ['$http', function ($http) {

  var apiKey = '9e421941650f3e6d9058baf8d69d4df9';

  return {
    topTags: function () {
      var url = 'http://ws.audioscrobbler.com/2.0/';
      return $http.get(url, {
        params: {
          method: 'chart.gettoptags', 
          api_key: apiKey,
          format:'json'
        }
      });
    },
    topArtists: function (tag) {
      var url = 'http://ws.audioscrobbler.com/2.0/';
      return $http.get(url, {
        params: {
          method: 'tag.gettopartists',
          api_key: apiKey,
          tag: tag,
          format:'json'
        }
      });
    }
  };
}]);

viz.controller('lastfmCtrl', ['$scope','lastfm', function ($scope, lastfm) {
  $scope.tagsize = 'reach';
  $scope.toptags = [];
  $scope.artists = [];

  $scope.resize = function () {
    $(".chartSVG").each(function () {
      var chart = $(this);
      var psize = chart.parent().width();
      chart.attr("width", psize);
      chart.attr("height", psize); // They're squares :)
    })
  }

  window.addEventListener('resize', $scope.resize);

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
      }
    });
}]);

viz.directive('toptagChart', ['lastfm', function (lastfm) {

  var link = function ($scope, $el, $attrs) {
    var diameter = 500;

    var bubble = d3.layout.pack()
      .sort(null)
      .size([diameter, diameter])
      .padding(2.5);

    var svg = d3.select($el[0]).append("svg")
      .attr("class", "chartSVG")
      .attr({width: diameter, height: diameter})
      .attr("viewBox", "0 0 " + diameter + " " + diameter)
      .append("g");

    svg.append("text").attr("id", "loading")
      .text("Loading...")
      .attr("transform", "translate(200,250)");

    var update = function () {
      var data = $scope.toptags.map(function (d) {
        d.value = d[$scope.tagsize];
        return d;
      });

      bubble.nodes({children: data});

      if (data.length) svg.select("#loading").remove();

      var selection = svg.selectAll(".node")
        .data(data);

      var enter = selection.enter()
        .append("g").attr("class", "node")
        .attr("transform", function (d) { 
          return "translate(" + d.x + "," + d.y + ")"; 
        });

      enter.append("circle")
        .attr("r", function (d) { return d.r; })
        .style("fill", '#9999ff')
        .on("click", function (d) {

          svg.selectAll("circle").style("fill", '#9999ff');
          d3.select(this).style("fill", "blue");

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
                $scope.artists = artists;
              }
            });
        });

      enter.append("text")
        .attr("dy", ".3em")
        .style("text-anchor", "middle")
        .text(function (d) { return d.name; });

      selection.transition().duration(2000)
        .attr("transform", function (d) { 
          return "translate(" + d.x + "," + d.y + ")";
        });

      selection.selectAll("circle").transition().duration(3000)
        .attr("r", function (d) { return d.r; });

      $scope.resize();
    };

    $scope.$watch('tagsize', update);
    $scope.$watch('toptags', update);

  };
  return {
    template: '<div class="col-sm-12 col-md-6 col-lg-6"></div>',
    replace: true,
    link: link, 
    restrict: 'E' 
  };

}]);

viz.directive('artistsChart', function () {

  var link = function ($scope, $el, $attrs) {
    var csize = [500, 500], radius = 22;

    var svg = d3.select($el[0]).append("svg")
      .attr("class", "chartSVG")
      .attr({width: csize[0], height: csize[1]})
      .attr("viewBox", "0 0 " + csize[0] + " " + csize[1])
      .append("g");

    var coords = function (position) {
      var x, y;
      x = ((position - 1) % 5) * 100;
      y = (Math.ceil(position / 5)) * 45;
      return {x: x, y: y};
    }

    var transform = function (d) {
      var c = coords(d.arank);
      return "translate(" + (c.x + radius + 30) + "," + c.y + ")"; 
    };

    svg.selectAll(".number")
      .data(d3.range(1,51)).enter()
      .append("text")
        .attr("class", "number")
        .style("text-anchor", "middle")
        .text(function (d) { return d; })
        .attr("transform", function (d) {
          var c = coords(d);
          return "translate(" + (c.x + radius + 30) + "," + (c.y + 12) + ")";
        }); 

    var update = function () {
      var data = $scope.artists.map(function (d) {
        d.value = 10;
        return d;
      });

      var selection = svg.selectAll(".node")
        .data(data, function (d) { return d.name; });

      selection.selectAll("circle")
        .style("fill", "blue")

      selection.transition().duration(2000)
        .attr("transform", transform);

      var enter = selection.enter()
        .append("g")
          .attr("class", "node")
          .style("opacity", 0)
          .attr("transform", transform); 

      enter.append("circle")
        .attr("r", radius)
        .style("fill", "#696758");

      enter.append("text")
        .attr("dy", ".3em")
        .style("text-anchor", "middle")
        .text(function (d) { return d.name.slice(0,15); });

      enter.transition().duration(2000)
        .style("opacity", 1)

      selection.exit().transition().duration(1000)
        .attr("transform", function (d) {
          return "translate(" + 1000 + "," + 1000 + ")"; 
        }).remove();

      $scope.resize();
    };

    $scope.$watch('artists', update);
  };
  return {
    template: '<div class="col-sm-12 col-md-6 col-lg-6"></div>',
    replace: true,
    link: link, 
    restrict: 'E'
  };
});