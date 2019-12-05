var selectedDrugs = new Array();
var allDrugs;
// var drugstoShow = 19;

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

function hideOnClickOutside() {
    const outsideClickListener = event => {
        if (!document.getElementById("drug-info").contains(event.target) && document.getElementById("search-dropdown").classList.contains("show")) { // or use: event.target.closest(selector) === null
          showSearch()
        }
    }

    const removeClickListener = () => {
        document.removeEventListener('click', outsideClickListener)
    }

    document.addEventListener('click', outsideClickListener)
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
    let scalingX = 300, scalingY = 120;

    var svgCircle = d3.select("#drug-viz-circle-svg"),
        width = document.getElementById("drug-viz-circle").getBoundingClientRect().width,
        height = document.getElementById("drug-viz-circle").getBoundingClientRect().height

    var color = d3.scaleOrdinal(d3.schemeCategory20);

    if (!selectedDrugs) {
        svgCircle.selectAll("*").remove()

        var ul = document.getElementById('unselected-drug-list')
        while(ul.firstChild ){
            ul.removeChild(ul.firstChild);
        }
        if (allDrugs.length) {
            populateSearch(allDrugs);
        } else {
            getAvailableDrugs();
        }
        
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
                        .style("padding-left", "20px")
                        .style("position", "absolute")
                        .style("font-size", "40px")
                        .style("font-weight", 300);

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
                            .attr('width', width)
                            .data(bubbleData)
                            .enter()
                            .append("circle")
                            .attr("class", "node")
                            .attr("r", function(d){return reSize(data['max_count'], d.value)})
                            .attr("cx", width / 2)
                            .attr("cy", height / 2)
                            .style("fill", function(d) {
                                return 'rgba(' + data.color[d.key].join(',') + ')'
                            })
                            .style("fill-opacity", 0.8)
                            .attr("stroke", "#333")
                            .style("stroke-width", 1)
                            .style("cursor", "pointer")
                            .on("mouseover", mouseover) // What to do when hovered
                            .on("mousemove", mousemove)
                            .on("mouseout", mouseleave)
                            .on("click", function(d) {
                                if (selectedDrugs.indexOf(d.key) === -1) {
                                    var ul = document.getElementById('unselected-drug-list');
                                    var li = document.getElementById(d.key)
                                    var selectedDrugsList = document.getElementById('selected-drugs-list');
                                    var close = li.childNodes[0].childNodes[1]
                                    console.log(close)
                                    updateSelectedDrugs(d.key);

                                    document.getElementById('drug-search').value = "" //Clear search
                                    
                                    ul.removeChild(li);
                                    selectedDrugsList.appendChild(li);
                                    li.style.display = "inline-block"
                                    close.style.display = "block";

                                    console.log(d.key)
                                }
                            })
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
                    .attr("cx", function(d){ return d.x; })
                    .attr("cy", function(d){ return d.y; })
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
    document.getElementById('viz-instructions').style.display = 'none'
}


async function getAvailableDrugs () {
    fetchJSON(function(json) {
        populateSearch(json)
    }, "/getdrugs");
}

/**
 * Populates the search area with drugs
 *
 */
function populateSearch(allDrugs) {
    var ul = document.getElementById('unselected-drug-list');
    var selectedDrugsList = document.getElementById('selected-drugs-list');
    var drugsListInstructions = document.getElementById('drug-list-instructions')
    
    hideOnClickOutside();

    allDrugs.forEach(function(drug) {     
        var li = document.createElement("li");
        li.id = drug
        var a = document.createElement('a');
        a.appendChild(document.createTextNode(drug));

        var liContainer = document.createElement('div')
        liContainer.className = 'li-container'
        var close = document.createElement("div")
        close.className = 'li-close'
        close.innerHTML = '&times;'
        close.style.display = "none";
        liContainer.appendChild(a)
        liContainer.appendChild(close)

        li.addEventListener('click', function(e) {

            updateSelectedDrugs(drug);

            document.getElementById('drug-search').value = "" //Clear search on click

            if (selectedDrugs.indexOf(e.target.innerText) > -1 ) {
                ul.removeChild(li);
                drugsListInstructions.style.display = 'none'
                selectedDrugsList.appendChild(li);
                close.style.display = "block";
            } else {
                selectedDrugsList.removeChild(li);
                if (!selectedDrugs.length) {
                    drugsListInstructions.style.display = 'block'
                }
                close.style.display = "none";
                ul.appendChild(li);
            }
        });

        a.href = "#";
        li.appendChild(liContainer)
        ul.appendChild(li);
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
    ul = document.getElementById("unselected-drug-list");
    li = ul.getElementsByTagName('li');
    // var num_visible = 0;

    // Loop through all list items, and hide those who don't match the search query
    for (i = 0; i < li.length; i++) {
        a = li[i].getElementsByTagName("a")[0];
        txtValue = a.textContent || a.innerText;
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
          // if (num_visible > drugstoShow) {
          //   li[i].style.display = "none";  
          // } else {
          //   li[i].style.display = "";
          // }
          li[i].style.display = "";
          // num_visible += 1
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

    document.getElementById('viz-instructions').innerHTML = 'Loading...'
    document.getElementById('viz-instructions').style.display = 'block'
    console.log("hi")
    ul = document.getElementById("unselected-drug-list");
    li = ul.getElementsByTagName('li');
    // var num_visible = 0

    for (i = 0; i < li.length; i++) {

        a = li[i].getElementsByTagName("a")[0];
        txtValue = a.textContent || a.innerText;
        if (drugs.indexOf(txtValue.toUpperCase()) > -1 || li[i].style.border === "1px solid black") {
            // if (num_visible > drugstoShow) {
            //     li[i].style.display = "none";  
            // } else {
            //     li[i].style.display = "";
            // }
            // num_visible += 1
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
    var eventInfo = document.getElementById('event-info');
    var vizLegend = document.getElementById('viz-legend');

    while(eventInfo.firstChild ){
        eventInfo.removeChild(eventInfo.firstChild);
    }

    var index = selectedDrugs.indexOf(drugName);
    if (index === -1) {
        selectedDrugs.push(drugName);
    } else {
        selectedDrugs.splice(index, 1);
    }

    if (selectedDrugs.length) {
        console.log(selectedDrugs);
        document.getElementById('viz-instructions').innerHTML = 'Loading...';
        document.getElementById('viz-instructions').style.display = 'block'
        postJSON(function (data) {
            if (data === 'No events'){
                document.getElementById('viz-instructions').innerHTML = 'No events found';
                var svgCircle = d3.select("#drug-viz-circle-svg");
                svgCircle.selectAll("*").remove();
            } else {
                circularPacking(data);
                populateEvents(data['events']);
            }
        }, selectedDrugs, "/getevents");
    } else {
        var eventInstructions = document.createElement('p')
        eventInstructions.innerHTML = "When you select a drug, a list of all the events in the FAERS database in which the individual took the selected drug will be shown here.";
        eventInstructions.className = "instructions";
        eventInfo.appendChild(eventInstructions);

        document.getElementById('viz-instructions').innerHTML = "When you select a drug, a circular packing visualization will be shown here.";
        document.getElementById('viz-instructions').style.display = 'block';

        var svgCircle = d3.select("#drug-viz-circle-svg");
        svgCircle.selectAll("*").remove();
    }

    if (selectedDrugs.length) {
        vizLegend.style.display = "flex";
    } else {
        vizLegend.style.display = "none";
    }
}


function populateEvents (eventsData) {

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
        
        //Grammar fixes
        if (event.age < 1) {
            var age = 'An infant '
        }
        else {
            var age = "A " + event.age + "-year-old "
        }

        if (eventDrugs.length == 2) {
            var drugsTaken = eventDrugs.slice(0, -1).join(', ') + ' and ' + eventDrugs[eventDrugs.length - 1] + "."
        } else if (eventDrugs.length == 1) {
            var drugsTaken = eventDrugs[0] + '.'
        } else {
            var drugsTaken = eventDrugs.slice(0, -1).join(', ') + ', and ' + eventDrugs[eventDrugs.length - 1] + "."
        }

        eventDetailsP.innerHTML = age + event.sex.toLowerCase() + " took " + drugsTaken
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
