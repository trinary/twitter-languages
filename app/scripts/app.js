/* global d3: false */
/* jshint -W015 */
/* 
/* I like my indent style, damn it. */
'use strict';

var svg = d3.select('svg'),
  margin = {left: 30, right: 0, top: 0, bottom: 40},
  width = 1024,
  height = 800,
  stackWidth = 80,
  set3 = ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd', '#ccebc5', '#ffed6f']; // ColorBrewer Set 3


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
      growthRate: entry.growthRate,
      y0: y0,
      y1: y0 += entry.percent
    };
  });
  d.total = d.pct[d.values.length - 1].y1;
};

var rateGroup = svg.append('g').attr({
  transform: 'translate(60,620)',
  id: 'rate'
});

var langSeries = function(langs, data) {
  var languages = [],
    filterFn = function(d) { return d.lang === current.key; };
  for(var i = 0; i < langs.length; ++i) {
    var current = {key: langs[i], values: []};
    for(var j = 0; j < data.length; ++j) {
      current.values.push(data[j].pct.filter(filterFn)[0]);
    }
    languages.push(current);
  }
  return languages;
};

var pctFormat = d3.format('.2f');

d3.csv('data/radial_tree_data.csv', function(csvData) {
  var data, years, langs, x, y,
      xAxis, languages, dates,
      langSelection, color, area, main, allYears, connections;

/* jshint -W106 */
/* seems that jshint complains about underscore_separated vars/attrs */
  csvData.forEach(function(d) {
    d.percent     = +d.percent;
    d.count       = +d.count;
    d.rank        = +d.rank;
    d.growthRate  = +d.growth_rate;
    d.dateBin     = +d.date_bin;
    d.year        = +d.date.substr(0,4);
  });
/* jshint +W106 */

  data = d3.nest()
    .key(function(d) { return d.year;} )
    .sortKeys(d3.ascending)
    .entries(csvData);

  data.forEach(function(d,i) {
    var sorted = d.values.sort(function(a,b) { return b.rank - a.rank;  });
    data[i].values = sorted;
  });

  data.forEach(calcPct);
  langs = data[0].values.map(function(d) { return d.lang; });
  dates = data.map(function(d) { return d.key; });
  languages = langSeries(langs, data);

  x = d3.scale.linear()
    .domain(d3.extent(data.map(function(d) { return d.key; })))
    .range([0,width - margin.left - margin.right - 100]);

  y = d3.scale.linear()
    .domain([0,100])
    .range([height - 200 - margin.bottom, 0]);

  xAxis = d3.svg.axis()
      .scale(x)
      .orient('bottom')
      .tickValues(data.map(function(d) { return d.key; }))
      .tickFormat(d3.format('4.0i'));

  color = d3.scale.ordinal()
    .domain(langs)
    .range(set3);

  area = d3.svg.area()
    .x(function(d, i) { if (i % 2 === 0) { return x(d.year) + stackWidth;} return x(d.year); })
    .y0(function(d) { return y(d.y0); })
    .y1(function(d) { return y(d.y1);})
    .interpolate('cardinal');

  main = svg.append('g').classed('main', true)
    .attr('transform','translate(60,0)');

  // Let's draw some lines
  connections = main.append('g').classed('conn-group', true);
  connections.selectAll('.lang-connections').data(languages)
    .enter()
    .append('g')
    .attr('class', function(d) { return 'lang-' + d.key.replace('/','') + ' lang-connections ';})
    .selectAll('.conn')
    .data(function(d) { return d3.pairs(d.values); })
    .enter()
    .append('path')
    .classed('conn', true)
    .attr('d', area)
    .attr('stroke-width', 1);

  allYears = main.append('g').classed('allyears',true);
  years = allYears.selectAll('.year').data(data);
  years.enter()
    .append('g')
    .attr({
      transform: function(d) { return 'translate(' + [x(d.key), 0] + ')'; }
    })
    .classed('year', true);

  langSelection = years.selectAll('.lang')
    .data(function(d) { return d.pct; });

  langSelection.enter()
    .append('g')
    .attr({
      class: function(d) { return ['lang ', 'lang-' + d.lang.replace('/',''),'rank-' + d.rank].join(' '); },
      transform: function(d) { return 'translate(' + [0,y(d.y1)] + ')'; }
    })
    .append('rect')
    .attr({
      x: 0,
      y: 0, //function(d,i) {return y(d.y1);},
      width: stackWidth,
      height: function(d) { return y(d.y0) - y(d.y1); },
      fill: function(d) { return color(d.lang);}
    });
  langSelection.filter(function (d) { return d.percent > 2.5; }).append('text')
    .text(function(d) { return d.lang; })
    .attr({
      x: 30,
      y: 14
    });

  main.append('g')
    .attr('transform', 'translate(' + [40,height - 200 - margin.bottom] + ')')
    .classed('axis', true)
    .call(xAxis);

  var highlight = function(d) {
    var lang = d.lang.replace('/','');
    d3.selectAll('.lang').classed('highlighted',false);
    d3.selectAll('.lang-connections').classed('highlighted',false);
    d3.selectAll('.lang-' + lang).classed('highlighted',true);
    updateLabel(lang);
    updateRate(lang);
  };

  var updateLabel = function(lang) {
    var langSeries = languages.filter(function(d) { return d.key.replace('/','') === lang; })[0];
    var label = d3.select('#label');
    var minRank = d3.min(langSeries.values, function(d) { return d.rank; });
    var maxPct = d3.max(langSeries.values, function(d) { return d.percent; });
    label.text('Language: ' + lang + ' Minimum Rank: ' + minRank + ' Maximum Percent: ' + pctFormat((maxPct)));
  };

  var updateRate = function(lang) {
    var langSeries = languages.filter(function(d) { return d.key.replace('/','') === lang; })[0];
    console.log(langSeries.values);
    var rates = langSeries.values.map(function(d) { return {year: d.year, growthRate: d.growthRate}; });

    var rateX = d3.scale.linear()
        .domain([2006,2012])
        .range([20,width - margin.left - margin.right - 20]);

    var rateY = d3.scale.linear()
      .domain(d3.extent(rates, function(d) { return d.growthRate; }))
      .range([100,0]);

    var yAxis = d3.svg.axis()
      .scale(rateY)
      .ticks(3)
      .tickFormat(d3.format('3s'))
      .orient('left');

    var line = d3.svg.line()
      .x(function(d) { return rateX(d.year); })
      .y(function(d) { return rateY(d.growthRate); });

    rateGroup.select('.ratepath').remove();
    rateGroup.append('path')
      .classed('ratepath',true)
      .datum(rates)
      .attr('d', line);
    rateGroup.call(yAxis);
  };

  langSelection.on('mouseover', highlight);
});
