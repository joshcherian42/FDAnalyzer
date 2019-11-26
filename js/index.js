/**
 * Scroll to element on header click
 *
 */
function scrollToElem(elemId) {
        document.querySelector('.main').scrollTo(0, document.getElementById(elemId).offsetTop - document.querySelector('.main').offsetTop);
}


/**
 * Load visualizations onto page
 *
 */
function load_viz() {

    let scalingX = 200
    let scalingY = 100
    var svg = d3.select("svg"),
        width = +svg.attr("width"),
        height = +svg.attr("height");

    var simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(function(d) { return d.id; }))
        .force("charge", d3.forceManyBody().strength(function (d, i) {
            var a = i == 0 ? -10000 : -1000;
            return a;
        }).distanceMin(200).distanceMax(1000))
        .force("center", d3.forceCenter(width / 2, height / 2));

    d3.json("https://pages.github.tamu.edu/sjr45/sjr45.github.io/", function(error, graph) {
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
                    .on("start", dragstarted)
                    .on("drag", dragged)
                    .on("end", dragended));
        

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

    function dragstarted(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragended(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}

/**
 * Convert csv to network dictionary
 *
 * @param {string} csv filepath
 *
 * @return {object} dictionary containing nodes and edges of network.
 */
function prep_data(fileName) {
    var networkData = {"nodes": new Array(), "links": new Array()};    
    //nodesl = new Array()
    //linksl = new Array()
    var counter = -1;
    d3.csv(fileName, function(data) {
        // var id = 1;
        data.forEach(function(d) {
            counter += 1;
            nodes = d.brands.split(' ')
            nodes.forEach(function (source, index) { 
                // source = parseInt(source)
                var node = {"id": source} 
                if(!networkData.nodes.some(e => e.id == source)) {
                    networkData.nodes.push(node)
                    // id += 1;
                }
                
                var target = nodes[index + 1];
                if (typeof target !== 'undefined') { // source is the last element in array
                    // target = parseInt(target)
                    var link = {"source": source,"target": target}
                    if(!networkData.links.some(e => (e.source == source && e.target == target) || (e.source == target && e.target == source))) {
                        networkData.links.push(link)
                    }
                }
            });
        })
    });
    return networkData;
}