angular.module('viz', []);

angular.module('viz').factory('lastfm', ['$http', function ($http) {

  // GET YOUR API KEY. IT'S FREE AT http://www.last.fm/api
  var apiKey = 'put_your_api_key_here';

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

angular.module('viz').controller('lastfmCtrl', ['$scope','$window','lastfm',

  function ($scope, $window, lastfm) {
    $scope.tagsize = 'reach';
    $scope.toptags = [];
    $scope.currtag = '';
    $scope.artists = [];

    $window.addEventListener('resize', function () {
      $scope.$broadcast('windowResize');
    });

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
  }
]);

angular.module('viz').directive('toptagChart', ['lastfm', 

  function (lastfm) {

    var link = function ($scope, $el, $attrs) {
      var diameter = 500;

      var bubble = d3.layout.pack()
        .sort(null)
        .size([diameter, diameter])
        .padding(2.5);

      var svg = d3.select($el[0]).append("svg")
        .attr({width: diameter, height: diameter})
        .attr("viewBox", "0 0 " + diameter + " " + diameter);

      var chart = svg.append("g");

      chart.append("text").attr("id", "loading")
        .text("Loading...")
        .attr("transform", "translate(200,250)");

      var update = function () {
        var data = $scope.toptags.map(function (d) {
          d.value = d[$scope.tagsize];
          return d;
        });

        bubble.nodes({children: data});

        if (data.length) chart.select("#loading").remove();

        var selection = chart.selectAll(".node")
          .data(data);

        var enter = selection.enter()
          .append("g").attr("class", "node")
          .attr("transform", function (d) { 
            return "translate(" + d.x + "," + d.y + ")"; 
          });

        enter.append("circle")
          .attr("r", function (d) { return d.r; })
          .style("fill", '#547980')
          .on("click", function (d) {
            svg.selectAll("circle").style("fill", '#547980');
            d3.select(this).style("fill", "#9DE0AD");

            lastfm.topArtists(d.name)
              .success(function (res) {
                if (res.error) {
                  throw new Error(res.message);
                } else {
                 $scope.currtag = d.name;
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

        resize();
      };

      function resize() {
        svg.attr("width", $el[0].clientWidth);
        svg.attr("height", $el[0].clientWidth); //It's a square
      }

      $scope.$on('windowResize',resize);
      $scope.$watch('tagsize', update);
      $scope.$watch('toptags', update);

    };
    return {
      template: '<div class="chart col-sm-12 col-md-12 col-lg-12 col-xl-12"></div>',
      replace: true,
      link: link, 
      restrict: 'E' 
    };
}]);

angular.module('viz').directive('artistsChart', ['$window', 

  function ($window) {

    var link = function ($scope, $el, $attrs) {
      var csize = [500, 500], radius = 22;

      var svg = d3.select($el[0]).append("svg")
        .attr({width: csize[0], height: csize[1]})
        .attr("viewBox", "0 0 " + csize[0] + " " + csize[1]);

      var chart = svg.append("g");

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

      chart.selectAll(".number")
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

        var selection = chart.selectAll(".node")
          .data(data, function (d) { return d.name; });

        selection.style("opacity", 1)

        selection.transition().duration(2000)
          .attr("transform", transform);

        selection.selectAll("circle")
          .style("fill", "#45ADA8")

        var enter = selection.enter()
          .append("g")
            .attr("class", "node")
            .style("opacity", 0)
            .attr("transform", transform); 

        enter.append("circle")
          .attr("r", radius)
          .style("fill", "#594F4F")
          .on("click", function (d) {
            $window.open(d.url, "_blank");
          });

        enter.append("text")
          .attr("dy", ".3em")
          .style("text-anchor", "middle")
          .text(function (d) { return d.name.slice(0,21); });

        enter.transition().duration(2000)
          .style("opacity", 1)

        selection.exit().transition().duration(1000)
          .attr("transform", function (d) {
            return "translate(" + 1000 + "," + 1000 + ")"; 
          }).remove();

        resize();
      };

      function resize() {
        svg.attr("width", $el[0].clientWidth);
        svg.attr("height", $el[0].clientWidth); //It's a square
      }

      $scope.$on('windowResize',resize);
      $scope.$watch('artists', update);
    };
    return {
      template: '<div class="chart col-sm-12 col-md-12 col-lg-12 col-xl-12"></div>',
      replace: true,
      scope: {artists: '='},
      link: link, 
      restrict: 'E'
    };
}]);
