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

var rebuildTimeout;
var load = function(url, opts) {
  $("#chart svg").empty().removeAttr("width").removeAttr("height");
  d3.csv(url, function(error, data) {
    if (error) {
      throw error;
    }

    build(data, opts);

    $(window).on("resize", function() {
      clearTimeout(rebuildTimeout);
      rebuildTimeout = setTimeout(function() {
        build(data, opts);
      }, 10);
    });

    $("#menu").on("show.bs.collapse", function() {
      $("svg").hide();
    });
    $("#menu").on("shown.bs.collapse", function() {
      build(data, opts);
      $("svg").show();
    });
    $("#menu").on("hidden.bs.collapse", function() {
      build(data, opts);
    });

    var dragging = false;
    $("#btn-menu").on("mousedown", function() {
      dragging = true;
    });
    $("#btn-menu").on("mouseup", function() {
      dragging = false;
    });
    $(document).on("mousemove", function() {
      if (dragging) {
        $("#btn-menu").trigger("click");
        dragging = false;
      }
    });
  });
};

var menu = new Vue({
  el: "#menu",
  data: {
    selected: "data/edc_temp.csv",
    datasets: {
      "data/greenland_d18o.csv": {
        title: "Ice Core δ18O (Greenland)",
        description: "Greenland Ice Core Chronology 2005 (GICC05) 60,000 Year, 20 Year Resolution Released 10 September 2007, with d18O data from NGRIP on this time scale. NGRIP dating group, 2008.",
        source: "ftp://ftp.ncdc.noaa.gov/pub/data/paleo/icecore/greenland/summit/ngrip/gicc05-60ka-20yr.txt",
        reverse: true,
        x: "age",
        y: "d18o"
      },
      "data/edc_d18o.csv": {
        title: "Ice Core δ18O (EPICA Dome C, Antarctica)",
        description: "EPICA Dome C Stable Isotope Data to 44.8 KYrBP. Stenni, B., et al. 2006.",
        source: "ftp://ftp.ncdc.noaa.gov/pub/data/paleo/icecore/antarctica/epica_domec/edc96-iso-45kyr.txt",
        reverse: true,
        x: "age",
        y: "d18o"
      },
      "data/edc_temp.csv": {
        title: "Ice Core Temperature (EPICA Dome C, Antarctica)",
        description: "EPICA Dome C Ice Core 800KYr Deuterium Data and Temperature Estimates. Jouzel, J., et al. 2007.",
        source: "ftp://ftp.ncdc.noaa.gov/pub/data/paleo/icecore/antarctica/epica_domec/edc3deuttemp2007.txt",
        reverse: true,
        xMax: 800000,
        x: "age",
        y: "temperature"
      },
      "data/fuji_temp.csv": {
        title: "Ice Core Temperature (Dome Fuji, Antarctica)",
        description: "Dome Fuji 360KYr Stable Isotope Data and Temperature Reconstruction. Uemura, R., V. Masson-Delmotte, J. Jouzel, A. Landais, H. Motoyama, and B. Stenni. 2012.",
        source: "https://www1.ncdc.noaa.gov/pub/data/paleo/icecore/antarctica/domefuji/df2012isotope-temperature.txt",
        reverse: true,
        xMax: 350000,
        x: "age",
        y: "Tsite"
      },
      "data/antarctic_co2.csv": {
        title: "Ice Core CO2 (Antarctica)",
        description: "Antarctic Ice Cores Revised 800KYr CO2 Data. Bereiter, B.; Eggleston, S.; Schmitt, J.; Nehrbass-Ahles, C.; Stocker, T.F.; Fischer, H.; Kipfstuhl, S.; Chappellaz, J.",
        source: "https://www1.ncdc.noaa.gov/pub/data/paleo/icecore/antarctica/antarctica2015co2composite.txt",
        reverse: true,
        xMin: 0,
        xMax: 800000,
        x: "age",
        y: "co2"
      },
      "data/ice_mlo_spo_co2.csv": {
        title: "Ice Core + Atmospheric CO2",
        description: "Atmospheric CO2 record based on ice core data before 1958, (Ethridge et. al., 1996; MacFarling Meure et al., 2006) and yearly averages of direct observations from Mauna Loa and the South Pole after and including 1958 (from Scripps CO2 Program).",
        source: "http://scrippsco2.ucsd.edu/data/atmospheric_co2/icecore_merged_products",
        x: "year",
        y: "co2"
      },
      "data/mlo_co2.csv": {
        title: "Atmospheric CO2 (Mauna Loa, Hawaii)",
        description: "C. D. Keeling, S. C. Piper, R. B. Bacastow, M. Wahlen, T. P. Whorf, M. Heimann, and H. A. Meijer, Exchanges of atmospheric CO2 and 13CO2 with the terrestrial biosphere and oceans from 1978 to 2000. I. Global aspects, SIO Reference Series, No. 01-06, Scripps Institution of Oceanography, San Diego, 88 pages, 2001.",
        source: "http://scrippsco2.ucsd.edu/data/atmospheric_co2/primary_mlo_co2_record",
        x: "date",
        y: "co2"
      },
      "data/deboer2014.csv": {
        title: "Reconstructed Sea Level",
        description: "Global 5 Million Year Sea Level, Temperature, and d18Osw Reconstructions. de Boer, B; Lourens, L.J.; van de Wal, R.S.W.",
        source: "https://www1.ncdc.noaa.gov/pub/data/paleo/reconstructions/deboer2014/deboer2014.txt",
        x: "age_calkaBP",
        y: "sealev"
      },
      "data/deboer2014.csv?temp": {
        title: "Reconstructed Temperature",
        description: "Global 5 Million Year Sea Level, Temperature, and d18Osw Reconstructions. de Boer, B; Lourens, L.J.; van de Wal, R.S.W.",
        source: "https://www1.ncdc.noaa.gov/pub/data/paleo/reconstructions/deboer2014/deboer2014.txt",
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
      load(key, this.datasets[key]);
    }
  }
});
