/*global define */

var svg = d3.select('svg'),
  margin = {left: 30, right: 0, top: 0, bottom: 40},
  width = 1024,
  height = 800,
  stack_width = 80,
  stack_margin = 5,
  set3 = ["#8dd3c7","#ffffb3","#bebada","#fb8072","#80b1d3","#fdb462","#b3de69","#fccde5","#d9d9d9","#bc80bd","#ccebc5","#ffed6f"], // ColorBrewer Set 3
  pastel1 =  ["#fbb4ae", "#b3cde3","#ccebc5","#decbe4","#fed9a6","#ffffcc","#e5d8bd","#fddaec","#f2f2f2"];


svg.attr({
  width: width,
  height: height
});

var calcPct = function(d) {
  var y0 = 0;
  d.pct = d.values.map(function(entry) {
    return {
      year: entry.year,
      lang: entry.lang,
      rank: entry.rank,
      percent: entry.percent,
      growth_rate: entry.growth_rate,
      y0: y0,
      y1: y0 += entry.percent
    }
  });
  d.total = d.pct[d.values.length - 1].y1;
}

var rateGroup = svg.append("g").attr({
  transform: "translate(60,620)",
  id: "rate"
});

var langSeries = function(langs, data) {
  var languages = [];
  for(var i = 0; i < langs.length; ++i) {
    var current = {key: langs[i], values: []};
    for(var j = 0; j < data.length; ++j) {
      current.values.push(data[j].pct.filter(function(d) { return d.lang === current.key})[0]);
    }
    languages.push(current);
  }
  return languages;
}

var pctFormat = d3.format(".2f");

d3.csv('data/radial_tree_data.csv', function(csv_data) {
  var data, years, langs, x, y,
      xaxis, yaxis, stack, languages,
      langSelection, color, area, curveArea, main, allYears, connections;

  csv_data.forEach(function(d) {
    d.percent     = +d.percent;
    d.count       = +d.count;
    d.rank        = +d.rank;
    d.growth_rate = +d.growth_rate;
    d.date_bin    = +d.date_bin;
    d.year        = +d.date.substr(0,4);
  });

  data = d3.nest()
    .key(function(d) { return d.year;} )
    .sortKeys(d3.ascending)
    .entries(csv_data);

  data.forEach(function(d,i) {
    var sorted = d.values.sort(function(a,b) { return b.rank - a.rank });
    data[i].values = sorted;
  });

  data.forEach(calcPct);
  langs = data[0].values.map(function(d) { return d.lang; });
  dates = data.map(function(d) {return d.key});
  languages = langSeries(langs, data);

  x = d3.scale.linear()
    .domain(d3.extent(data.map(function(d) { return d.key; })))
    .range([0,width - margin.left - margin.right - 100]);

  y = d3.scale.linear()
    .domain([0,100])
    .range([height - 200 - margin.bottom, 0]);

  xaxis = d3.svg.axis()
      .scale(x)
      .orient("bottom")
      .tickValues(data.map(function(d) { return d.key; }))
      .tickFormat(d3.format("4.0i"))

  color = d3.scale.ordinal()
    .domain(langs)
    .range(set3);

  area = d3.svg.area()
    .x(function(d, i) { if (i % 2 == 0) return x(d.year) + stack_width; return x(d.year); })
    .y0(function(d) { return y(d.y0); })
    .y1(function(d) { return y(d.y1);})
    .interpolate("cardinal");

  curveArea = function(d,i) {
    var x0 = x(d[0].year) + stack_width,
        x1 = x(d[1].year),
        xdist = x1 - x0,
        y00 = y(d[0].y0),
        y01 = y(d[0].y1),
        y11 = y(d[1].y1),
        y10 = y(d[1].y0);
    var topline = line([
        [x0,y01],
        [x0, y01],
        [x0, y11],
        [x1,y11]
        ]);
    var bottomline = line([
        [x1,y10],
        [x1,y01],
        [x1,y10],
        [x0,y00]
        ]);

    return [
      topline,
      bottomline,
      'M' + [x0,y01],
      'Z'].join(' ');
  }

  main = svg.append("g").classed("main", true)
    .attr("transform","translate(60,0)");

  // Let's draw some lines
  connections = main.append('g').classed('conn-group', true);
  connections.selectAll('.lang-connections').data(languages)
    .enter()
    .append('g')
    .attr('class', function(d,i) { return 'lang-' + d.key.replace('/','') + ' lang-connections ';})
    .selectAll('.conn')
    .data(function(d) { return d3.pairs(d.values) })
    .enter()
    .append('path')
    .classed('conn', true)
    .attr("d", area)
    .attr("stroke-width", 1);

  allYears = main.append("g").classed("allyears",true);
  years = allYears.selectAll('.year').data(data);
  years.enter()
    .append('g')
    .attr({
      transform: function(d,i) { return 'translate(' + [x(d.key), 0] + ')'},
    })
    .classed('year', true);

  langSelection = years.selectAll('.lang')
    .data(function(d,i) { return d.pct; });

  langSelection.enter()
    .append('g')
    .attr({
      class: function(d,i) { return ['lang ', 'lang-' + d.lang.replace('/',''),'rank-' + d.rank].join(' ') ;},
      transform: function(d,i) { return "translate(" + [0,y(d.y1)] + ")"}
    })
    .append('rect')
    .attr({
      x: 0,
      y: 0, //function(d,i) {return y(d.y1);},
      width: stack_width,
      height: function(d) { return y(d.y0) - y(d.y1); },
      fill: function(d,i) { return color(d.lang);}
    });
  langSelection.filter(function (d,i) { return d.percent > 2.5; }).append("text")
    .text(function(d) { return d.lang })
    .attr({
      x: 30,
      y: 14
    });

  main.append("g")
    .attr("transform", "translate(" + [40,height - 200 - margin.bottom] + ")")
    .classed("axis", true)
    .call(xaxis);

  var highlight = function(d,i) {
    var lang = d.lang.replace('/','');
    d3.selectAll('.lang').classed("highlighted",false)
    d3.selectAll('.lang-connections').classed("highlighted",false)
    var all = d3.selectAll('.lang-' + lang).classed("highlighted",true)
    updateLabel(lang);
    updateRate(lang);
  }

  var updateLabel = function(lang) {
    var langSeries = languages.filter(function(d) { return d.key.replace('/','') === lang; })[0];
    var label = d3.select("#label");
    var minRank = d3.min(langSeries.values, function(d) { return d.rank; });
    var maxPct = d3.max(langSeries.values, function(d) { return d.percent; });
    label.text("Language: " + lang + " Minimum Rank: " + minRank + " Maximum Percent: " + pctFormat((maxPct)));
  }
  var updateRate = function(lang) {
    var langSeries = languages.filter(function(d) { return d.key.replace('/','') === lang; })[0];
    var rates = langSeries.values.map(function(d) { return {year: d.year, growth_rate: d.growth_rate}; });

    var rate_x = d3.scale.linear()
        .domain([2006,2012])
        .range([20,width - margin.left - margin.right - 20]);

    var rate_y = d3.scale.linear()
      .domain(d3.extent(rates, function(d) { return d.growth_rate; }))
      .range([100,0]);
    var y_axis = d3.svg.axis()
      .scale(rate_y)
      .ticks(3)
      .tickFormat(d3.format("3s"))
      .orient("left");


    var line = d3.svg.line()
      .x(function(d,i) { return rate_x(d.year); })
      .y(function(d,i) { return rate_y(d.growth_rate); });
    rateGroup.select(".ratepath").remove()
    rateGroup.append("path")
      .classed("ratepath",true)
      .datum(rates)
      .attr("d", line);
    rateGroup.call(y_axis);
  }

  langSelection.on("mouseover", highlight);
});
