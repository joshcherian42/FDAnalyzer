var selectedDrugs = new Array() 
/**
 * Scroll to element on header click
 *
 */
function scrollToElem(elemId) {
        document.querySelector('.main').scrollTo(0, document.getElementById(elemId).offsetTop - document.querySelector('.main').offsetTop);
}


function networkViz() {
    let scalingX = 200
    let scalingY = 100
    var svg = d3.select("#drug-viz"),
        width = +svg.attr("width"),
        height = +svg.attr("height");
    var simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(function(d) { return d.id; }))
        .force("charge", d3.forceManyBody().strength(function (d, i) {
            var a = i == 0 ? -10000 : -1000;
            return a;
        }).distanceMin(200).distanceMax(1000))
        .force("center", d3.forceCenter(width / 2, height / 2));

    d3.json("/sample_data/sample/events.json", function(error, graph) {
        if (error) throw error;

        var link = svg.append("g")
                    .attr("class", "links")
                    .selectAll("line")
                    .data(graph.links)
                    .enter().append("line");
        var color = d3.scaleOrdinal(d3.schemeCategory20);
        var node = svg.append("g")
                    .attr("class", "nodes")
                    .selectAll("circle")
                    .data(graph.nodes)
                    .enter().append("circle")
                    .attr("cursor", "pointer")
                    .attr("fill", "rgb(31, 119, 180)")
                    .call(d3.drag()
                    .on("start", dragstarted_network)
                    .on("drag", dragged_network)
                    .on("end", dragended_network));
        

        node.append("title")
          .text(function(d) { return d.id; });
        
        node.attr("r", function(d) {return d.count * 7});
        
        node.on("click", function(d) {
            var brand_name = document.getElementById('brand_name')
            var drug_name = document.getElementById('drug_name')

            brand_name.textContent = d.id
            drug_name.textContent = d.count
        })

        node.on("mouseover", function(d) {
            var connectedNodeIds = graph
              .links
              .filter(x => x.source.id == d.id || x.target.id == d.id)
              .map(x => x.source.id == d.id ? x.target.id : x.source.id);
            
            d3.select(".nodes")
              .selectAll("circle")
              .attr("fill", function(c) {
                if (connectedNodeIds.indexOf(c.id) > -1 || c.id == d.id) return "red";
                else return color(c.group);
              })
              .attr("opacity", function(c) {
                if (connectedNodeIds.indexOf(c.id) == -1 && c.id != d.id) return 0.3;
                else return 1;
              });
            
            d3.select(".links")
              .selectAll("line")
              .attr("opacity", function(c) {
                if ((connectedNodeIds.indexOf(c.source.id) > -1 && c.target.id == d.id) ||
                    (connectedNodeIds.indexOf(c.target.id) > -1 && c.source.id == d.id)) {
                    return 1;
                }
                else return 0.2;
              });

            d3.select(this).transition()
                .duration(500)
                .attr("r", d.count * 7 * 1.5)
                .attr("opacity", 0.7);
            
        });

        node.on("mouseout", function(d) {
            d3.select(".nodes")
              .selectAll("circle")
              .attr("fill", function(c) { return color(c.group); })
              .attr("opacity", 1);
            d3.select(this).transition()
                .duration(500)
                .attr("r", d.count * 7)
                .attr("opacity", 1);
            d3.select(".links")
              .selectAll("line")
              .attr("opacity", 1);
        });

        simulation
          .nodes(graph.nodes)
          .on("tick", ticked);

        simulation.force("link")
          .links(graph.links);

        function ticked() {
            link
                .attr("x1", function(d) { return d.source.x - scalingX; })
                .attr("y1", function(d) { return d.source.y + scalingY; })
                .attr("x2", function(d) { return d.target.x - scalingX; })
                .attr("y2", function(d) { return d.target.y + scalingY; });

            node
                .attr("cx", function(d) { return d.x - scalingX; })
                .attr("cy", function(d) { return d.y + scalingY; });
        }
    });

    function dragstarted_network(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
            d3.select(d).style.zIndex = 1;
    }

    function dragged_network(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragended_network(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
        d3.select(d).style.zIndex = 'initial';
    }
}

function circularPacking() {
    let scalingX = 200, scalingY = 200

    var svgCircle = d3.select("#drug-viz-circle-svg"),
        width = document.getElementById("drug-viz-circle").getBoundingClientRect().width,
        height = document.getElementById("drug-viz-circle").getBoundingClientRect().height
    var color = d3.scaleOrdinal(d3.schemeCategory20);

    

    d3.json("/sample_data/bubble_viz/drug_nodes_sample.json", function(error, graph) {
            
        // Get drugs that have events in common with the selected drugs and the number of events they have in common
        var filteredData = graph.filter(d => selectedDrugs.indexOf(d.brand_name) !== -1);
        
        events = new Array()
        filteredData.forEach(function(d) {
            events.push(d.event_ids)
            filteredData.common_events = 0
        })

        //Get intersection of event arrays
        var events = events.shift().filter(function(v) {
            return events.every(function(a) {
                return a.indexOf(v) !== -1;
            });
        });

        bubbleData = []
        singleBubbleData = []
        events.forEach (function(e) {
            drugsInEventData = graph.filter(d => d.event_ids.indexOf(e) !== -1)
            drugsInEventData.forEach (function(d) {
                if (drugsInEventData.length > selectedDrugs.length) {
                    var index = bubbleData.findIndex(p => p.brand_name == d.brand_name)
                    if (index === -1) {
                        d.common_events = 1
                        bubbleData.push(d)
                    } else {
                        bubbleData[index].common_events += 1
                    }
                } else {
                    var index = singleBubbleData.findIndex(p => p.brand_name == drugsInEventData[0].brand_name)
                    if (index === -1) {
                        drugsInEventData[0].single_event = 1
                        singleBubbleData.push(d)
                    } else {
                        singleBubbleData[index].single_event += 1
                    }
                }
            })
        })

        if (bubbleData.length === 0 ) {
            graphData = singleBubbleData
        } else {
            graphData = bubbleData
        }


        if (graphData.length === 0) {
            svgCircle.selectAll("*").remove()
            svgCircle.append("text")
                     .attr('x', width / 2  - scalingY)
                     .attr('y', height / 2)
                     .text('There were no events reported with this combination of drugs')
        } else {
            var size = d3.scaleLinear()
                         .domain([0, 100])
                         .range([20, 55])  // circle will be between 7 and 55 px wide
            svgCircle.selectAll("*").remove()

            //Display drug name on hover
            var Tooltip = d3.select("#drug-viz-circle")
                        .append("div")
                        .style("opacity", 0)
                        .attr("class", "tooltip")
                        .style("background-color", "white")
                        .style("border", "solid")
                        .style("border-width", "2px")
                        .style("border-radius", "5px")
                        .style("padding", "5px")
                        .style("position", "absolute")

            var mouseover = function(d) {
                Tooltip.transition()        
                .duration(200)      
                .style("opacity", .9);      
                Tooltip.html(d.brand_name)
                .style("left", d3.event.pageX + "px")     
                .style("top", (d3.event.pageY - 28) + "px")
                .attr('mouseOverX', d3.event.pageX)
                .attr('mouseOverY', d3.event.pageY - 28);
            }
            var mousemove = function(d) {
                 Tooltip.transition()        
                .duration(0)      
                .style("opacity", .9);      
                if (d.mouseOverX) {
                    Tooltip.style("left", d.mouseOverX + "px")     
                    .style("top", (d.mouseOverY) + "px");
                } else {
                    Tooltip.attr('mouseOverX', d3.event.pageX)
                    .attr('mouseOverY', d3.event.pageY - 28);
                }


                // Tooltip
                // .html(d.brand_name)
                // .style("left", (d3.event.pageX) + "px")     
                // .style("top", (d3.event.pageY - 28) + "px");
            }
            var mouseleave = function(d) {
                Tooltip.transition()
                .style("opacity", 0)
                console.log("mouseleave")
            }

            var node = svgCircle.append("g")
                                 .selectAll("circle")
                                 .data(graphData)
                                 .enter()
                                 .append("circle")
                                 .attr("class", "node")
                                 .attr("r", function(d){ 
                                    if (bubbleData.length === 0 ) {
                                        return size(d.single_event)
                                    } else {
                                        return size(d.common_events)
                                    }

                                 })
                                 .attr("cx", width / 2)
                                 .attr("cy", height / 2)
                                 .style("fill", function(d){ return color(d.region)})
                                 .style("fill-opacity", 0.8)
                                 .attr("stroke", "black")
                                 .style("stroke-width", 1)
                                 .on("mouseover", mouseover) // What to do when hovered
                                 .on("mousemove", mousemove)
                                 .on("mouseout", mouseleave)
                                 .call(d3.drag() // call specific function when circle is dragged
                                 .on("start", dragstarted)
                                 .on("drag", dragged)
                                 .on("end", dragended));
        
            // Features of the forces applied to the nodes:
            var simulation = d3.forceSimulation()
              .force("center", d3.forceCenter().x(width / 2).y(height / 2)) // Attraction to the center of the svg area
              .force("charge", d3.forceManyBody().strength(.1)) // Nodes are attracted one each other of value is > 0
              .force("collide", d3.forceCollide().strength(.2).radius(function(d){ return (size(d.common_events)+3) }).iterations(1)) // Force that avoids circle overlapping

            // Apply these forces to the nodes and update their positions.
            // Once the force algorithm is happy with positions ('alpha' value is low enough), simulations will stop.
            simulation
                .nodes(graph)
                .on("tick", function(d){
            node
                .attr("cx", function(d){ return d.x; })
                .attr("cy", function(d){ return d.y; })
            });

            // What happens when a circle is dragged?
            function dragstarted(d) {
                console.log('dragstarted')
                if (!d3.event.active) simulation.alphaTarget(.03).restart();
                d.fx = d.x;
                d.fy = d.y;
            }
            function dragged(d) {
                console.log('dragged')
                d.fx = d3.event.x;
                d.fy = d3.event.y;

            }
            function dragended(d) {
                console.log('dragended')
                if (!d3.event.active) simulation.alphaTarget(.03);
                d.fx = null;
                d.fy = null;
            }
        }
    });
}



/**
 * Load visualizations onto page
 *
 */
function loadViz() {
    // var numitems =  document.getElementById("myUL").getElementsByTagName("li").length;
    // var containerSize = document.getElementById("myUL").offsetWidth

    // console.log(containerSize)
    // document.getElementById("myUL").style.columnCount = parseInt(numitems/3);
    // populateDrugList()
    // networkViz()
    // circularPacking()
    populateSearch()
    
}

function loadJSON(callback) {   
  var xobj = new XMLHttpRequest();
  xobj.overrideMimeType("application/json");
  xobj.open('GET', "/sample_data/bubble_viz/drug_nodes_sample.json", true);
  xobj.onreadystatechange = function () {
    if (xobj.readyState == 4 && xobj.status == "200") {
      callback(JSON.parse(xobj.responseText));
    }
  };
  xobj.send(null);  
}

/**
 * Populates the search area with drugs
 *
 */
function populateSearch() {
    var ul = document.getElementById('drug-list')
    loadJSON(function(json) {
        json.forEach(function(drug) {
            var li = document.createElement("li");
            var a = document.createElement('a')
            a.appendChild(document.createTextNode(drug.brand_name));
            li.addEventListener('click', function(e) {
                console.log("clicked " + e.target.innerText);
                updateSelectedDrugs(e.target.innerText);
                console.log(selectedDrugs)
                circularPacking()
            })
            a.href = "#"
            li.appendChild(a)
            ul.appendChild(li);
        })
        // console.log(json)
    });
}

/**
 * Filters the search results on keyUp
 *
 */
function filterSearch() {
  // Declare variables
  var input, filter, ul, li, a, i, txtValue;
  input = document.getElementById('drug-search');
  filter = input.value.toUpperCase();
  ul = document.getElementById("drug-list");
  li = ul.getElementsByTagName('li');

  // Loop through all list items, and hide those who don't match the search query
  for (i = 0; i < li.length; i++) {
    a = li[i].getElementsByTagName("a")[0];
    txtValue = a.textContent || a.innerText;
    if (txtValue.toUpperCase().indexOf(filter) > -1) {
      li[i].style.display = "";
    } else {
      li[i].style.display = "none";
    }
  }
}

function updateSelectedDrugs(drugName) {
    var index = selectedDrugs.indexOf(drugName)
    if (index === -1) {
        selectedDrugs.push(drugName);
    } else {
        selectedDrugs.splice(index, 1);
    }
}
