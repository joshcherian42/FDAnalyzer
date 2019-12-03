var selectedDrugs = new Array()

/**
 * Scroll to element on header click
 *
 */
function scrollToElem(elemId) {
    document.querySelector('.main').scrollTo(0, document.getElementById(elemId).offsetTop - document.querySelector('.main').offsetTop);
}


function showSearch() {
    document.getElementById("search-dropdown").classList.toggle("show");
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

    d3.json("/getevents", function(error, graph) {
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


function reSize(maxSize, value) {
    width = document.getElementById("drug-viz-circle").getBoundingClientRect().width,
    height = document.getElementById("drug-viz-circle").getBoundingClientRect().height
    if (maxSize > 20000) {
        max_size = width*height/maxSize
    }
    else{
        max_size = 150
    }

    var t = d3.scaleLinear()
              .domain([0, maxSize])
              .range([10, max_size])  // circle will be between 20 and 55 px wide
    return t(value)
}


function circularPacking(data) {
    let scalingX = 300, scalingY = 50;
    console.log(data['max_count'])
    var svgCircle = d3.select("#drug-viz-circle-svg"),
        width = document.getElementById("drug-viz-circle").getBoundingClientRect().width,
        height = document.getElementById("drug-viz-circle").getBoundingClientRect().height

    var color = d3.scaleOrdinal(d3.schemeCategory20);

    var size = d3.scaleLinear()
                 .domain([0, 200])
                 .range([20, 100])  // circle will be between 20 and 55 px wide

    if (!selectedDrugs) {
        svgCircle.selectAll("*").remove()

        var ul = document.getElementById('unselected-drug-list')
        while(ul.firstChild ){
            ul.removeChild(ul.firstChild);
        }
        populateSearch()
    } else {

        svgCircle.selectAll("*").remove()

        //Display drug name on hover
        tooltips = document.getElementsByClassName("tooltip")
        if (tooltips.length) {
            tooltips[0].parentNode.removeChild(tooltips[0])
        }

        var Tooltip = d3.select("#drug-viz-circle")
                        .insert("div", ":first-child")
                        .style("opacity", 0)
                        .attr("class", "tooltip")
                        .style("padding", "5px")
                        .style("padding-top", "0px")
                        .style("position", "absolute")
                        .style("font-size", "40px")
                        .style("font-weight", 300)
                        .style("left", "25px")
                        .style("top", "0px");

        var mouseover = function(d) {
            Tooltip.style("opacity", 1)
        }
        var mousemove = function(d) {
            Tooltip
                .html(d.key)
                .style("opacity", 1)
        }
        var mouseleave = function(d) {
            Tooltip.style("opacity", 0)
        }

        var bubbleData = d3.entries(data['count']);
        var node = svgCircle.append("g")
                            .selectAll("circle")
                            .data(bubbleData)
                            .enter()
                            .append("circle")
                            .attr("class", "node")
                            .attr("r", function(d){return reSize(data['max_count'], d.value)})
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
                           .force("forceX", d3.forceX().strength(.05).x(width * .5))
                           .force("forceY", d3.forceY().strength(.05).y(height * .5))
                           .force("center", d3.forceCenter().x(width / 2).y(height / 2)) // Attraction to the center of the svg area
                           .force("charge", d3.forceManyBody().strength(-.1)) // Nodes are attracted one each other of value is > 0
                           .force("collide", d3.forceCollide().strength(.2).radius(function(d){ return (reSize(data['max_count'], d.value)+3) }).iterations(1)) // Force that avoids circle overlapping

        // Apply these forces to the nodes and update their positions.
        // Once the force algorithm is happy with positions ('alpha' value is low enough), simulations will stop.
        simulation
            .nodes(bubbleData)
            .on("tick", function(d){
                node
                    .attr("cx", function(d){ return d.x - scalingX; })
                    .attr("cy", function(d){ return d.y - scalingY; })
            });

        function dragstarted(d) {
            if (!d3.event.active) simulation.alphaTarget(.03).restart();
            d.fx = d.x;
            d.fy = d.y;
        }
        function dragged(d) {
            d.fx = d3.event.x;
            d.fy = d3.event.y;
        }
        function dragended(d) {
            if (!d3.event.active) simulation.alphaTarget(.03);
            d.fx = null;
            d.fy = null;
        }
    }
}


/**
 * Populates the search area with drugs
 *
 */
async function populateSearch() {
    var ul = document.getElementById('unselected-drug-list')
    var selectedDrugsList = document.getElementById('selected-drugs-list')

    fetchJSON(function(json) {
        json.forEach(function(drug) {
            var li = document.createElement("li");
            var a = document.createElement('a');
            a.appendChild(document.createTextNode(drug));
            li.addEventListener('click', function(e) {
                console.log("clicked " + e.target.innerText);
                updateSelectedDrugs(e.target.innerText);
                // circularPacking();
                if (selectedDrugs.indexOf(e.target.innerText) > -1 ) {
                    li.style.border = "1px solid black";
                    ul.removeChild(li);
                    selectedDrugsList.appendChild(li);
                } else {
                    selectedDrugsList.removeChild(li);
                    ul.appendChild(li);
                    li.style.border = "1px solid #ddd";
                }
            });

            a.href = "#";
            li.appendChild(a);
            ul.appendChild(li);
        })
    },"/getdrugs");
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
    ul = document.getElementById("unselected-drug-list");
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

/**
 * Updates the search with only drugs that have events in common with the selected drugs
 *
 */
function updateSearch (drugs) {

    postJSON(function (value) {
        console.log(value);
    }, selectedDrugs, 'getdrugs')

    ul = document.getElementById("unselected-drug-list");
    li = ul.getElementsByTagName('li');

    for (i = 0; i < li.length; i++) {
        a = li[i].getElementsByTagName("a")[0];
        txtValue = a.textContent || a.innerText;
        if (drugs.indexOf(txtValue.toUpperCase()) > -1 || li[i].style.border === "1px solid black") {
            li[i].style.display = "";
        } else {
            li[i].style.display = "none";
        }
    }
}

/**
 * Maintains array of selected drugs
 *
 */
function updateSelectedDrugs(drugName) {
    var eventInfo = document.getElementById('event-info')

    while(eventInfo.firstChild ){
        eventInfo.removeChild(eventInfo.firstChild);
    }

    var index = selectedDrugs.indexOf(drugName)
    if (index === -1) {
        selectedDrugs.push(drugName);
    } else {
        selectedDrugs.splice(index, 1);
    }
    if (selectedDrugs.length) {
        console.log(selectedDrugs)
        postJSON(function (data) {
            circularPacking(data)
            populateEvents(data['events'])
        }, selectedDrugs, "/getevents")
    } else {
        var svgCircle = d3.select("#drug-viz-circle-svg")
        svgCircle.selectAll("*").remove()
    }
}


function populateEvents (eventsData) {
    //Loop through eventsData
    
    var eventInfo = document.getElementById('event-info')

    Object.keys(eventsData).forEach(function(key) {
        event = eventsData[key]

        var eventCard = document.createElement('div')
        eventCard.className = "event-card"

        // Create summary
        var eventDetails = document.createElement('div')
        eventDetails.className = "event-details"

        var eventDetailsP = document.createElement('p')
        
        var eventDrugs = event.drugs.split(',')
        eventDetailsP.innerHTML = "A " + event.age + "-old " + event.sex.toLowerCase() + " took " + eventDrugs.slice(0, -1).join(', ') + ", and " + eventDrugs[eventDrugs.length - 1] + "."
        eventDetails.append(eventDetailsP)
        eventCard.append(eventDetails)
        
        // Symptoms
        var symptoms = document.createElement('div')
        symptoms.className = 'Symptoms'

        symptomsTitle = document.createElement('p')
        symptomsTitle.className = 'title'
        symptomsTitle.innerHTML = 'Symptoms:'

        symptomsList = document.createElement('p')
        symptomsList.innerHTML = event.symptoms.split(',').join(', ')

        symptoms.append(symptomsTitle)
        symptoms.append(symptomsList)
        eventCard.append(symptoms)
        
        // Outcome
        var outcome = document.createElement('div')
        outcome.className = 'Outcome'

        outcomeTitle = document.createElement('p')
        outcomeTitle.className = 'title'
        outcomeTitle.innerHTML = 'Outcome:'

        outcomeList = document.createElement('p')
        if (event.hospital === 1) {
            outcomeList.innerHTML = 'Hospital'
        } else if (event.lifethreaten === 1) {
            outcomeList.innerHTML = 'Life Threatening'
        } else if (event.death === 1) {
            outcomeList.innerHTML = 'Death'
        } else if (event.disability === 1) {
            outcomeList.innerHTML = 'Disability'
        } else if (event.other === 1) {
            outcomeList.innerHTML = 'Other'
        } else {
            outcomeList.innerHTML = 'Unknown'
        }
        // outcome.innerHTML = event.symptoms.split(',').join(', ')

        //hospital: 0, lifethreaten: 0, death: 0, disability: 0, other: 1
        outcome.append(outcomeTitle)
        outcome.append(outcomeList)
        eventCard.append(outcome)

        // Sender
        var sender = document.createElement('div')
        sender.className = 'Sender'

        senderTitle = document.createElement('p')
        senderTitle.className = 'title'
        senderTitle.innerHTML = 'Reported By:'

        senderList = document.createElement('p')
        senderList.innerHTML = event.sender

        sender.append(senderTitle)
        sender.append(senderList)
        eventCard.append(sender)

        eventInfo.append(eventCard)
    });
}


function fetchJSON(callback, path) {
    fetch(path, {
      headers : {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
       }

    })
        .then((resp)=> resp.json())
        .then((resp)=>callback(resp))
        .catch(function (error) {
            console.log("something went wrong");
            console.log(JSON.stringify(error))
        })
}

function postJSON(callback, data, path) {
    fetch(path, {
        headers : {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip'
       },
        method: 'post',
        body: JSON.stringify({"data" : data})
  }).then(function(response) {
      console.log(response);
      return response.json();
  }).then(function(data) {
      callback(data);
  });
}

