var clean = function(selector) {
  $("#chart svg").empty().removeAttr("width").removeAttr("height");
};

var build = function(data, opts) {
  var margin = { top: 40, right: 50, bottom: 40, left: 50 };
  var width = $("#chart").width() - margin.left - margin.right;
  var height = $("#chart").height() - margin.top - margin.bottom;

  var ds = [];

  for (var i = 0, n = data.length; i < n; i++) {
    var x = data[i][opts.x];
    var y = data[i][opts.y];
    if (x && y) {
      ds.push({
        x: opts.x === "date" ? new Date(x) : Number(x),
        y: Number(y)
      });
    }
  }

  var xMin = "xMin" in opts ? opts.xMin : d3.min(ds, function(d) { return d.x; });
  var xMax = "xMax" in opts ? opts.xMax : d3.max(ds, function(d) { return d.x; });
  var yMin = "yMin" in opts ? opts.yMin : d3.min(ds, function(d) { return d.y; });
  var yMax = "yMax" in opts ? opts.yMax : d3.max(ds, function(d) { return d.y; });

  var xScale = (opts.x === "date" ? d3.scaleTime() : d3.scaleLinear()).
    range([0, width]).
    domain(opts.reverse ? [xMax, xMin] : [xMin, xMax]).
    nice();

  var yScale = d3.scaleLinear().
    range([height, 0]).
    domain([yMin, yMax]).
    nice();

  var svg = d3.select("#chart svg").
    attr("width", width + margin.left + margin.right).
    attr("height", height + margin.top + margin.bottom).
    append("g").
    attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var yLine = d3.line().
    defined(function(d) {
      return d.x <= xMax && d.x >= xMin && d.y >= yMin && d.y <= yMax;
    }).
    x(function(d) { return xScale(d.x); }).
    y(function(d) { return yScale(d.y); }).
    curve(d3.curveBasis);

  var xAxis = d3.axisBottom(xScale).
    tickPadding(10).
    tickSize(-height);

  var yAxis = d3.axisRight(yScale).
    tickPadding(10).
    tickSize(width);

  var gY = svg.append("g").
    attr("class", "y axis").
    call(yAxis);

  if (opts.yLine) {
    svg.append("line").
      attr("y1", yScale(opts.yLine)).
      attr("y2", yScale(opts.yLine)).
      attr("x1", xScale(xMin)).
      attr("x2", xScale(xMax)).
      attr("stroke", "red").
      attr("opacity", "0.25").
      attr("stroke-width", "2");
  }

  var gX = svg.append("g").
    attr("class", "x axis").
    attr("transform", "translate(0," + height + ")").
    call(xAxis);

  var path = svg.append("path").
    data([ds]).
    attr("class", "line").
    attr("stroke", opts.color || "#17a2b8").
    attr("d", yLine);

  var zoom = d3.zoom().
    scaleExtent([1, 128]).
    translateExtent([[0, 0], [width, height]]).
    extent([[0, 0], [width, height]]).
    on("zoom", zoomed);

  var view = svg.append("rect").
    attr("class", "zoom").
    attr("width", width).
    attr("height", height).
    attr("opacity", "0").
    call(zoom);

  svg.append("defs").append("clipPath").
    attr("id", "clip").append("rect").
    attr("width", width).attr("height", height);

  function zoomed() {
    var xRescale = d3.event.transform.rescaleX(xScale); // .nice();

    var domain = xRescale.domain();
    var xZoomMin = domain[0];
    var xZoomMax = domain[1];
    //var xZoomMin = 0;
    //var xZoomMin = domain[0] < xMin ? xMin : domain[0];
    //var xZoomMax = domain[1] > xMax ? xMax : domain[1];
    //xRescale = xRescale.domain([xZoomMin, xZoomMax]);

    gX.call(xAxis.scale(xRescale));

    //path.style("stroke-width", 1.5 / d3.event.transform.k + "px");
    var yZoomLine = yLine.x(function(d) { return xRescale(d.x); });
    path.attr("d", yZoomLine);
  }

  svg.append("text").
    attr("class", "title").
    attr("x", (width / 2)).
    attr("y", 5 - (margin.top / 2)).
    attr("text-anchor", "middle").
    text(opts.title);
};

var timeout;
var load = function(url, opts) {
  d3.csv(url, function(error, data) {
    if (error) {
      throw error;
    }

    build(data, opts);

    var reset = function() {
      clearTimeout(timeout);
      timeout = setTimeout(function() {
        clean();
        build(data, opts);
      }, 10);
    };
    $(window).on("resize", reset);
    $("#menu").on("shown.bs.collapse", reset);
    $("#menu").on("hidden.bs.collapse", reset);
  });
};

var app = new Vue({
  el: "#app",
  data: {
    selected: "data/edc_temp.csv",
    datasets: {
      "data/greenland_d18o.csv": {
        title: "Greenland Ice Core Chronology 2005",
        description: "Greenland Ice Core Chronology 2005 (GICC05) 60,000 Year, 20 Year Resolution Released 10 September 2007, with d18O data from NGRIP on this time scale. NGRIP dating group, 2008.",
        source: "ftp://ftp.ncdc.noaa.gov/pub/data/paleo/icecore/greenland/summit/ngrip/gicc05-60ka-20yr.txt",
        reverse: true,
        x: "age",
        y: "d18o"
      },
      "data/edc_d18o.csv": {
        title: "EPICA Dome C Stable Isotope Data",
        description: "EPICA Dome C Stable Isotope Data to 44.8 KYrBP. Stenni, B., et al. 2006.",
        source: "ftp://ftp.ncdc.noaa.gov/pub/data/paleo/icecore/antarctica/epica_domec/edc96-iso-45kyr.txt",
        reverse: true,
        x: "age",
        y: "d18o"
      },
      "data/edc_temp.csv": {
        title: "EPICA Dome C Ice Core Temperature Estimates",
        description: "EPICA Dome C Ice Core 800KYr Deuterium Data and Temperature Estimates. Jouzel, J., et al. 2007.",
        source: "ftp://ftp.ncdc.noaa.gov/pub/data/paleo/icecore/antarctica/epica_domec/edc3deuttemp2007.txt",
        reverse: true,
        xMax: 800000,
        x: "age",
        y: "temperature"
      },
      "data/antarctic_co2.csv": {
        title: "Antarctic Ice Cores Revised CO2 Data",
        description: "Antarctic Ice Cores Revised 800KYr CO2 Data. Bereiter, B.; Eggleston, S.; Schmitt, J.; Nehrbass-Ahles, C.; Stocker, T.F.; Fischer, H.; Kipfstuhl, S.; Chappellaz, J.",
        source: "https://www1.ncdc.noaa.gov/pub/data/paleo/icecore/antarctica/antarctica2015co2composite.txt",
        reverse: true,
        xMin: 0,
        xMax: 800000,
        x: "age",
        y: "co2"
      },
      "data/fuji_temp.csv": {
        title: "Dome Fuji Temperature Reconstruction",
        reverse: true,
        xMax: 350000,
        x: "age",
        y: "Tsite"
      },
      "data/ice_mlo_spo_co2.csv": {
        title: "Merged Ice Cores MLO/SPO CO2 Data",
        x: "year",
        y: "co2"
      },
      "data/mlo_co2.csv": {
        title: "Mauna Loa Atmospheric CO2 Concentrations",
        x: "date",
        y: "co2"
      },
      "data/deboer2014.csv": {
        title: "Global 5 Million Year Sea Level Reconstructions",
        x: "age_calkaBP",
        y: "sealev"
      },
      "data/deboer2014.csv?temp": {
        title: "Global 5 Million Year Temperature Reconstructions",
        x: "age_calkaBP",
        y: "tempanomNH"
      }
    }
  },
  mounted: function() {
    var key = this.selected;
    load(key, this.datasets[key]);
  },
  watch: {
    selected: function(key) {
      clean();
      load(key, this.datasets[key]);
    }
  }
});
