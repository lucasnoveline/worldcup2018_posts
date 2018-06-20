// Dimensions of sunburst.
var width = $("#chart").width();
var height = width;
var radius = Math.min(width, height) / 2;

// Breadcrumb dimensions: width, height, spacing, width of tip/tail.
var b = {
  w: 8*width/60, h: 9*width/120, s: 3, t: width/60
};

// Mapping of step names to colors.
var colors = {
  "Egito": "#C09300",
  "Rússia": "#0039A6",
  "Arábia Saudita": "#006C35",
  "Uruguai": "#0038A8",
  "Irã": "#239F40",
  "Marrocos": "#006233",
  "Portugal": "#DB161B",
  "Espanha": "#FFC400",
  "Austrália": "#012169",
  "Dinamarca": "#C60C30",
  "França": "#002395",
  "Peru": "#D91023",
  "Argentina": "#74ACDF",
  "Croácia": "#FF0000",
  "Islândia": "#02529C",
  "Nigéria": "#008751",
  "Brasil": "#009B3A",
  "Costa Rica": "#002B7F",
  "Sérvia": "#EDB92E",
  "Suíça": "#E30A17",
  "Alemanha": "#DD0000",
  "México": "#006847",
  "Coreia do Sul": "#024FA2",
  "Suécia": "#FECD01",
  "Bélgica": "#FAE042",
  "Inglaterra": "#CF142B",
  "Panamá": "#005293",
  "Tunísia": "#E70013",
  "Colômbia": "#FCD116",
  "Japão": "#BC002D",
  "Polônia": "#DC143C",
  "Senegal": "#00853F",
  "Oitavas": "#1a84b8",
  "Quartas": "#1a8cb8",
  "Semi": "#1a94b8",
  "Final": "#1a9cb8",
  "Campeão": "#FFD700",
  "Eliminado": "#bbb0ac"
};

// Total size of all segments; we set this later, after loading the data.
var totalSize = 0; 

var order_vector = ['Brasil', 'Espanha', 'Alemanha', 'França', 'Argentina', 'Inglaterra', 'Bélgica', 'Portugal',
                      'Colômbia', 'Uruguai', 'Peru', 'Polônia', 'Suíça', 'México', 'Croácia', 'Suécia', 'Islândia',
                      'Dinamarca', 'Rússia', 'Irã', 'Costa Rica', 'Coreia do Sul', 'Japão', 'Sérvia', 'Austrália',
                      'Senegal', 'Panamá', 'Egito', 'Marrocos', 'Tunísia', 'Arábia Saudita', 'Nigéria', 'Oitavas',
                      'Quartas', 'Semi', 'Final', 'Campeão', 'Eliminado'];

var vis = d3.select("#chart").append("svg:svg")
    .attr("preserveAspectRatio", "xMidYMid")
    .attr("viewBox", "0 0 " + width + " " + height)
    .append("svg:g")
    .attr("id", "container")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

var partition = d3.layout.partition()
    .size([2 * Math.PI, radius * radius])
    .value(function(d) { return d.size; })
    .sort(function(a, b) { return order_vector.indexOf(a.name) - order_vector.indexOf(b.name); });

var arc = d3.svg.arc()
    .startAngle(function(d) { return d.x; })
    .endAngle(function(d) { return d.x + d.dx; })
    .innerRadius(function(d) { return Math.sqrt(d.y); })
    .outerRadius(function(d) { return Math.sqrt(d.y + d.dy); });

// Use d3.text and d3.csv.parseRows so that we do not need to have a header
// row, and can receive the csv as an array of arrays.
d3.text("AllTeams.csv", function(text) {
  var csv = d3.csv.parseRows(text);
  var json = buildHierarchy(csv);
  createVisualization(json);
});

// Main function to draw and set up the visualization, once we have the data.
function createVisualization(json) {

  // Basic setup of page elements.
  initializeBreadcrumbTrail();

  // Bounding circle underneath the sunburst, to make it easier to detect
  // when the mouse leaves the parent g.
  vis.append("svg:circle")
      .attr("r", radius)
      .style("opacity", 0);

  // For efficiency, filter nodes to keep only those large enough to see.
  var nodes = partition.nodes(json)
      .filter(function(d) {
      return (d.dx > 0.005); // 0.005 radians = 0.29 degrees
      });

  var path = vis.data([json]).selectAll("path")
      .data(nodes)
      .enter().append("svg:path")
      .attr("display", function(d) { return d.depth ? null : "none"; })
      .attr("d", arc)
      .attr("fill-rule", "evenodd")
      .style("fill", function(d) { return colors[d.name]; })
      .style("opacity", 1)
      .on("mouseover", mouseover);

  // Add the mouseleave handler to the bounding circle.
  d3.select("#container").on("mouseleave", mouseleave);

  // Get total size of the tree = value of root node from partition.
  totalSize = path.node().__data__.value;
 };

// Fade all but the current sequence, and show it in the breadcrumb trail.
function mouseover(d) {

  var percentage = Math.round(100 * d.value);
  var percentageString = percentage + "%";
  if (percentage < 0.1) {
    percentageString = "< 0.1%";
  }
  var sequenceArray = getAncestors(d);
  var country = sequenceArray[0];

  d3.select('#country')
      .text(country['name']);

  d3.select("#percentage")
      .text(percentageString);

  d3.select("#explanation")
      .style("visibility", "");

  updateBreadcrumbs(sequenceArray, percentageString);

  // Fade all the segments.
  d3.selectAll("path")
      .style("opacity", 0.3);

  // Then highlight only those that are an ancestor of the current segment.
  vis.selectAll("path")
      .filter(function(node) {
                return (sequenceArray.indexOf(node) >= 0);
              })
      .style("opacity", 1);
}

// Restore everything to full opacity when moving off the visualization.
function mouseleave(d) {
  // Hide the breadcrumb trail
  d3.select("#trail")
      .style("visibility", "hidden");

  // Deactivate all segments during transition.
  d3.selectAll("path").on("mouseover", null);

  // Transition each segment to full opacity and then reactivate it.
  d3.selectAll("path")
      .transition()
      .duration(1000)
      .style("opacity", 1)
      .each("end", function() {
              d3.select(this).on("mouseover", mouseover);
            });

  d3.select("#explanation")
      .style("visibility", "hidden");
}

// Given a node in a partition layout, return an array of all of its ancestor
// nodes, highest first, but excluding the root.
function getAncestors(node) {
  var path = [];
  var current = node;
  while (current.parent) {
    path.unshift(current);
    current = current.parent;
  }
  return path;
}

function initializeBreadcrumbTrail() {
  // Add the svg area.
  var width = $("#chart").width();
  var trail = d3.select("#sequence").append("svg:svg")
      .attr("width", width)
      .attr("height", 0.1*width)
      .attr("id", "trail");

  d3.select('#sequence')
     .attr("height", 0.1*width);
  // Add the label at the end, for the percentage.
  trail.append("svg:text")
    .attr("id", "endlabel")
    .style("fill", "#000");
}

// Generate a string that describes the points of a breadcrumb polygon.
function breadcrumbPoints(d, i) {
  var width = $("#chart").width();
  var b = {
  w: 8*width/60, h: 9*width/120, s: 3, t: width/60
  };
  var points = [];
  points.push("0,0");
  points.push(b.w + ",0");
  points.push(b.w + b.t + "," + (b.h/3));
  points.push(b.w + "," + b.h);
  points.push("0," + b.h);
  if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
    points.push(b.t + "," + (b.h/3));
  }
  return points.join(" ");
}

// Update the breadcrumb trail to show the current sequence and percentage.
function updateBreadcrumbs(nodeArray, percentageString) {
  var width = $("#chart").width();
  var b = {
  w: 8*width/60, h: 9*width/120, s: 3, t: width/60
  };
  d3.select('#sequence')
      .attr("height", 0.1*width);

  d3.select('#trail')
      .attr("width", width)
      .attr("height", 0.1*width);

  // Data join; key function combines name and depth (= position in sequence).
  var g = d3.select("#trail")
      .selectAll("g")
      .data(nodeArray, function(d) { return d.name + d.depth; });

  // Add breadcrumb and label for entering nodes.
  var entering = g.enter().append("svg:g");

  entering.append("svg:polygon")
      .attr("points", breadcrumbPoints)
      .style("fill", function(d) { return colors[d.name]; });

  entering.append("svg:text")
      .attr("x", (b.w + b.t) / 2)
      .attr("y", b.h / 2)
      .attr("dy", "0.3em")
      .attr("text-anchor", "middle")
      .text(function(d) { return d.name; })
      .attr('font-size', b.h/3.5);

  // Set position for entering and updating nodes.
  g.attr("transform", function(d, i) {
    return "translate(" + i * (b.w + b.s) + ", 0)";
  });

  // Remove exiting nodes.
  g.exit().remove();

  // Now move and update the percentage at the end.
  d3.select("#trail").select("#endlabel")
      .attr("x", (nodeArray.length + 0.5) * (b.w + b.s))
      .attr("y", b.h / 2)
      .attr("dy", "0.25em")
      .attr("text-anchor", "middle")
      .text(percentageString)
      .attr('font-size', b.h/3.5);

  // Make the breadcrumb trail visible, if it's hidden.
  d3.select("#trail")
      .style("visibility", "");

}

// Take a 2-column CSV and transform it into a hierarchical structure suitable
// for a partition layout. The first column is a sequence of step names, from
// root to leaf, separated by hyphens. The second column is a count of how 
// often that sequence occurred.
function buildHierarchy(csv) {
  var root = {"name": "root", "children": []};
  for (var i = 0; i < csv.length; i++) {
    var sequence = csv[i][0];
    var size = +csv[i][1];
    if (isNaN(size)) { // e.g. if this is a header row
      continue;
    }
    var parts = sequence.split("-");
    var currentNode = root;

    for (var j = 0; j < parts.length; j++) {
      var children = currentNode["children"];
      var nodeName = parts[j];
      var childNode;
      if (j + 1 < parts.length) {
         // Not yet at the end of the sequence; move down the tree.
        var foundChild = false;
        for (var k = 0; k < children.length; k++) {
          if (children[k]["name"] == nodeName) {
            childNode = children[k];
            foundChild = true;
            break;
          }
        }
        // If we don't already have a child node for this branch, create it.
        if (!foundChild) {
          childNode = {"name": nodeName, "children": []};
          children.push(childNode);
        }
        currentNode = childNode;
      } else {
  // Reached the end of the sequence; create a leaf node.
  childNode = {"name": nodeName, "size": size};
  children.push(childNode);
      }
    }
  }
  return root;
};
