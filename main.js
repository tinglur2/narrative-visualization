var current_page = 1;
var total_pages = 3;

//Implement previous page
function onClickPrevious() {
    current_page = (current_page - 1 + total_pages) % total_pages;
    if (current_page === 0) {
        current_page = total_pages;
    }
    setPageStatus();
}

//Implement next page
function onClickNext() {
    current_page = (current_page % total_pages) + 1;
    setPageStatus()
}

//update page status by button
function setPageStatus() {
    for (let i = 1; i <= total_pages; i++) {
        const pageBox = document.getElementById('page' + i);
        if (pageBox) {
            if (i === current_page) {
                pageBox.style.display = 'block';
            } else {
                pageBox.style.display = 'none';
            }
        }
    }
}

document.getElementById("prev").onclick = onClickPrevious;
document.getElementById("next").onclick = onClickNext;

//render d3js charts
render_chart_1();
render_chart_2();
render_chart_3();

//====================Rendering data simultaneously===================================
/**
 * render_chart_1
 */
function render_chart_1() {
    // Set the width, height and margins of the chart
    const marginSetting = {top: 80, right: 30, bottom: 40, left: 90},
        width = 1200 - marginSetting.left - marginSetting.right,
        height = 500 - marginSetting.top - marginSetting.bottom;

    // Creating wrapper Elements
    const wrapper = d3.select("#svg1")
        .attr("width", width + marginSetting.left + marginSetting.right)
        .attr("height", height + marginSetting.top + marginSetting.bottom)
        .append("g")
        .attr("transform", `translate(${marginSetting.left},${marginSetting.top})`);

    // Create the tooltip div
    const tooltip = d3.select('#tooltip')

    // read csv file
    d3.csv("EVData2024.csv").then(csvData => {
        // Filter the data to only keep the data of EV sales parameters and year lower then 2024
        csvData = csvData.filter(d => d.parameter === "EV sales" && d.region !== "World" && d.year < 2024);

        // Convert the year and value of a string to numeric type
        csvData.forEach(d => {
            d.year = +d.year;
            d.value = +d.value;
        });
        // Sort the years
        const years = [...new Set(csvData.map(d => d.year))].sort((a, b) => a - b);

        // Create x-axis and y-axis scales
        const x = d3.scaleBand()
            .domain(years)
            .range([0, width])
            .padding(0.1);

//           const colorTheme  = d3.scaleOrdinal([
//     "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728",
//     "#9467bd", "#8c564b", "#e377c2", "#7f7f7f",
//     "#bcbd22", "#17becf", "#9e14b5", "#e6a5c0",
//     "#8e8c7d", "#c4e7d3", "#f7a9a1", "#c8e4f8",
//     "#d0d1e6", "#7b3294", "#f4a582", "#d95f02",
//     "#d0841f", "#d1d3e0"
// ]);

        //
        // Grouping data by year and region
        const nestedData = d3.groups(csvData, d => d.year, d => d.region)
            .map(([year, values]) => {
                const result = {year: +year};
                values.forEach(([region, entries]) => {
                    result[region] = d3.sum(entries, d => d.value);
                });
                return result;
            });
        // handle data to stack
        const regions = [...new Set(csvData.map(d => d.region))];
        const stackedData = d3.stack()
            .keys(regions)
            .value((d, key) => d[key] || 0)(nestedData);
        // Creating a Color Scale
        const colorTheme = d3.scaleOrdinal()
            .domain(regions)
            .range(d3.schemeCategory10);


        // Create a y-axis scale based on the maximum value after stacking
        const y = d3.scaleLinear()
            .domain([0, d3.max(stackedData, layer => d3.max(layer, d => d[1]))])
            .nice()
            .range([height, 0]);

        // Adding an x-axis
        const xAxis = wrapper.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).tickFormat(d3.format("d")))
            .append("text")
            .attr("class", "axis-label")
            .attr("x", width)
            .attr("y", 40)
            .attr("text-anchor", "end")
            .text("Year");


        // Adding a y-axis
        wrapper.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(y))
            .append("text")
            .attr("class", "axis-label")
            .attr("x", -6)
            .attr("y", 6)
            .attr("dy", "-1.5em")
            .attr("text-anchor", "end")
            .text("Value");

        // Draw a stacked column chart
        wrapper.selectAll("g.layer")
            .data(stackedData)
            .enter().append("g")
            .attr("class", "layer")
            .attr("fill", d => colorTheme(d.key))
            .selectAll("rect")
            .data(d => d)
            .enter().append("rect")
            .attr("x", d => x(d.data.year))
            .attr("y", d => y(d[1]))
            .attr("height", d => y(d[0]) - y(d[1]))
            .attr("width", x.bandwidth())
            .on("mouseover", function (event, d) {
                const yearData = d.data;
                const displayMode = 'show-all-data'; // Adjust as needed
                const datapoint = {
                    ...yearData,
                };
                const tooltipHtml = updateTooltipContent(datapoint, displayMode);

                tooltip.transition().duration(200).style("opacity", .9);
                tooltip.html(tooltipHtml)
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 100) + "px")
                    .style("display", "block");
            })
            .on("mousemove", function (event) {
                tooltip.style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 100) + "px").style("display", "block");

            })
            .on("mouseout", function () {
                tooltip.transition().duration(100).style("opacity", 0).style("display", "none");
            });


        // Function to update tooltip content based on the selected display mode
        function updateTooltipContent(datapoint, displayMode, activeLine) {

            // Build the tooltip HTML content with colored circles
            let tooltipHtml = `<strong>${datapoint.year}</strong><br>`;
            // Always show Total Deaths to the tooltip with a separator below it

            // Sort the dataKeys array by the corresponding data values
            const dataKeys = Object.keys(datapoint).filter(key => key !== 'year');
            const sortedKeys = dataKeys.slice().sort((a, b) => datapoint[b] - datapoint[a]);

            if (displayMode === 'show-top-4-data') {
                // Limit to the top 3 data keys and exclude 'all_deaths' from the sorted keys
                const topKeys = sortedKeys.slice(0, 4);
                topKeys.forEach(key => {
                    const formattedValue = (datapoint[key]);
                    const lineColor = colorTheme(regions.indexOf(key));
                    tooltipHtml += `
                        <span class="key">${key} </span>
                        <span class="value">${formattedValue}</span><br>
                    `;
                });
            } else {
                // Show all data keys except 'all_deaths' in the tooltip using sortedKeys
                sortedKeys.forEach(key => {
                    const formattedValue = (datapoint[key]);
                    const lineColor = colorTheme(regions.indexOf(key));
                    tooltipHtml += `
                        <span class="key">${key} </span>
                        <span class="value">${formattedValue}</span><br>
                    `;
                });
            }

            return tooltipHtml;
        }


        // add legend
        const legend = wrapper.selectAll(".legend")
            .data(colorTheme.domain())
            .enter().append("g")
            .attr("class", "legend")
            .attr("transform", (d, i) => `translate(${(i % 4) * 100 + 120},${Math.floor(i / 4) * 30})`);

        legend.append("rect")
            .attr("x", width - 18)
            .attr("width", 18)
            .attr("height", 18)
            .style("fill", colorTheme);

        legend.append("text")
            .attr("x", width - 24)
            .attr("y", 9)
            .attr("dy", ".35em")
            .style("text-anchor", "end")
            .text(d => d);

    }).catch(error => {
        console.error('Error ==>', error);
    });
}


//+++++++++++++++++++++++++++++++++++++++++++++CHART1+++++++++++++++++++++++++++++++
/**
 * render_chart_2
 */
function render_chart_2() {
    //create the year selector
    function dropdownMenu(selection, props) {
        const {
            options, onOptionClicked, selectedOption
        } = props;

        let select = selection.selectAll('select').data([null]);
        select = select.enter().append('select')
            .merge(select)
            .attr('class', 'form-control')
            .on('change', function () {
                onOptionClicked(this.value);
            });

        select.attr("width", 200)

        const option = select.selectAll('option').data(options);
        option.enter().append('option')
            .merge(option)
            .attr('value', d => d)
            .property('selected', d => d === selectedOption)
            .text(d => d);
    }


    var defaultYear = '2023';

    /**
     * displayYearSelector
     * @param csvData2
     */
    function displayYearSelector(csvData2) {
        let options = [...new Set(csvData2.map(d => d.year))].sort();
        var selectedData = csvData2.filter(d => {
            return (d.year === defaultYear && d.parameter === "EV stock" && d.region !== "World")
        });
        displayChart(selectedData);

        dropdownMenu(d3.select('#menus'), {
            options: options, onOptionClicked: year => {
                defaultYear = year;
                var selectedData = csvData2.filter(d => {
                    return d.year == year && d.parameter === "EV stock" && d.region !== "World"
                });
                displayChart(selectedData);
            }, selectedOption: defaultYear
        });
    }

    /**
     * displayChart
     * @param data
     */
    function displayChart(data) {
        // Convert the year and value of a string to numeric type
        data.forEach(d => {
            d.year = +d.year;
            d.value = +d.value;
        });

        const countryNameMap = {
            "USA": "United States of America",
        }
        data.forEach(d => {
            if (countryNameMap[d.region]) {
                d.region = countryNameMap[d.region];
            }
        });
        // Set the width, height and margins of the chart
        const marginSetting = {top: 80, right: 30, bottom: 40, left: 90},
            width = 1400 - marginSetting.left - marginSetting.right,
            height = 500 - marginSetting.top - marginSetting.bottom;

        // Creating wrapper Elements
        const chart2 = d3.select("#svg2")
            .attr("width", width + marginSetting.left + marginSetting.right)
            .attr("height", height + marginSetting.top + marginSetting.bottom)
            .append("g")
            .attr("transform", `translate(${marginSetting.left},${marginSetting.top})`);


        // geoMercator
        const projection = d3.geoMercator()
            .scale(150)
            .translate([width / 2, height / 1.5]);

        // geoPath
        const path = d3.geoPath().projection(projection);


        // load world json
        d3.json("https://unpkg.com/world-atlas@2/countries-50m.json").then(world => {

            // Summarize data
            let EvStockByCountry = d3.rollup(data, v => d3.sum(v, d => +d.value), d => d.region);
            // Preparing region data
            const countriesFeatures = topojson.feature(world, world.objects.countries).features;

            // set EV stock for every country
            countriesFeatures.forEach(country => {
                const countryName = country.properties.name;
                country.properties.value = EvStockByCountry.get(countryName) || 0;
            });

            // Calculate the maximum and minimum values
            let values = Array.from(EvStockByCountry.values());
            let maxValue = d3.max(values);
            let minValue = d3.min(values);

            let color = d3.scaleQuantize()
                .domain([minValue, maxValue])
                .range(d3.schemeBlues[9]);

            // draw the map
            chart2.selectAll(".country")
                .data(countriesFeatures)
                .enter().append("path")
                .attr("class", "country")
                .attr("d", path)
                .attr("fill", d => color(d.properties.value))
                .on("mouseover", function (event, d) {
                    d3.select(this).style("stroke", "black").style("stroke-width", "1px");
                    tooltip.transition().duration(200).style("opacity", .9);
                    tooltip.html(`${d.properties.name}: ${d.properties.value}`)
                        .style("left", (event.pageX + 5) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function (d) {
                    d3.select(this).style("stroke", null).style("stroke-width", null);
                    tooltip.transition().duration(500).style("opacity", 0);
                });

            // create legend
            const legend = chart2.append("g")
                .attr("class", "legend")
                .attr("transform", `translate(${width - 150},${height - 300})`);

            const legendWidth = 20;
            const legendHeight = 200;

            const legendColors = color.range();
            const legendScale = d3.scaleLinear()
                .domain(color.domain())
                .range([0, legendHeight]);

            legend.selectAll("rect")
                .data(legendColors)
                .enter().append("rect")
                .attr("x", 0)
                .attr("y", (d, i) => legendScale(color.invertExtent(d)[1]))
                .attr("width", legendWidth)
                .attr("height", legendHeight / legendColors.length)
                .style("fill", d => d);

            legend.append("text")
                .attr("x", 0)
                .attr("y", -10)
                .text("EV Stock");

            // create tooltips
            const tooltip = d3.select("body").append("div")
                .attr("class", "chart2_tooltip")
                .style("opacity", 0);


        })
    }

    //read csv data
    d3.csv("EVData2024.csv").then(csvData => {
        displayYearSelector(csvData)
    });

}

//+++++++++++++++++++++++++++++++++++++++++++++CHART2+++++++++++++++++++++++++++++++
/**
 * render_chart_3
 */
function render_chart_3() {

    /**
     * dropdownMenu
     * @param selection
     * @param props
     */
    function dropdownMenu(selection, props) {
        const {
            options, onOptionClicked, selectedOption
        } = props;

        let select = selection.selectAll('select').data([null]);
        select = select.enter().append('select')
            .merge(select)
            .attr('class', 'form-control')
            .on('change', function () {
                onOptionClicked(this.value);
            });

        select.attr("width", 200)

        const option = select.selectAll('option').data(options);
        option.enter().append('option')
            .merge(option)
            .attr('value', d => d)
            .property('selected', d => d === selectedOption)
            .text(d => d);
    }


    var defaultYear = '2023';

    /**
     * displayYearSelector year selector
     * @param csvData2
     */
    function displayYearSelector(csvData2) {
        let options = [...new Set(csvData2.map(d => d.year))].sort();
        var selectedData = csvData2.filter(d => {
            return (d.year === defaultYear && d.parameter === "EV sales" && d.region !== "World")
        });
        displayChart(selectedData);

        dropdownMenu(d3.select('#menus2'), {
            options: options, onOptionClicked: year => {
                defaultYear = year;
                var selectedData = csvData2.filter(d => {
                    return d.year == year && d.parameter === "EV sales" && d.region !== "World"
                });
                displayChart(selectedData);
            }, selectedOption: defaultYear
        });
    }

    /**
     * displayChart
     * @param data csv data
     */
    function displayChart(data) {
        // Convert the year and value of a string to numeric type
        data.forEach(d => {
            d.value = +d.value;
        });

        // Group the data by category
        const catagoryData = d3.groups(data, d => d.powertrain);

        // Sum the value of each group
        const sumData = catagoryData.map(([category, values]) => {
            const allvalue = d3.sum(values, d => d.value);
            return {category, allvalue};
        });

        // Set the width, height and margins of the chart
        const marginSetting = {top: 80, right: 30, bottom: 40, left: 90},
            width = 1400 - marginSetting.left - marginSetting.right,
            height = 500 - marginSetting.top - marginSetting.bottom;
        const radius = Math.min(width, height) / 2;
        //  create piechart
        const piechart = d3.select("#svg3")
            .attr("width", width + marginSetting.left + marginSetting.right)
            .attr("height", height + marginSetting.top + marginSetting.bottom)
            .append("g")
            .attr("transform", `translate(${width / 2}, ${height / 1.4})`);

        //set the color theme
        const colortheme = d3.scaleOrdinal(d3.schemeSet2);

        const pie = d3.pie()
            .sort(null)
            .value(d => d.allvalue);
        const arc = d3.arc()
            .innerRadius(0)
            .outerRadius(radius - 10);
        const arcs = piechart.selectAll('.arc')
            .data(pie(sumData))
            .enter().append('g')
            .attr('class', 'arc');

        arcs.append('path')
            .attr('d', arc)
            .style('fill', d => colortheme(d.data.category));
        //add tooltips
        const mytooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0)
            .style('position', 'absolute')
            .style('background-color', '#f9f9f9')
            .style('border', '1px solid #ddd')
            .style('padding', '5px')
            .style('border-radius', '3px');

        arcs.on('mouseover', function (event, d) {
            mytooltip.transition().duration(200).style('opacity', .9);
            mytooltip.html(`<strong>Category:</strong> ${d.data.category}<br><strong>Total:</strong> ${d.data.allvalue}`)
                .style('left', `${event.pageX + 5}px`)
                .style('top', `${event.pageY - 20}px`);
        }).on('mouseout', function () {
            mytooltip.transition().duration(600).style('opacity', 0);
        });


        // piechart.selectAll('.legend').remove();
        // const legend = piechart.append('g')
        //     .attr('class', 'legend')
        //     .attr('transform', `translate(${radius + 30}, ${-height / 2 + 20})`);
        // const legendItems = legend.selectAll('.legend-item')
        //     .data(sumData)
        //     .enter().append('g')
        //     .attr('class', 'legend-item')
        //     .attr('transform', (d, i) => `translate(0, ${i * 20})`);
        //
        // legendItems.append('rect')
        //     .attr('x', 0)
        //     .attr('width', 18)
        //     .attr('height', 18)
        //     .style('fill', d => colortheme(d.category));
        //
        // legendItems.append('text')
        //     .attr('x', 30)
        //     .attr('y', 9)
        //     .attr('dy', '.35em')
        //     .style('text-anchor', 'start')
        //     .text(d => d.category);

         // add label and data
        const labelArc = d3.arc()
            .outerRadius(radius - 40)
            .innerRadius(radius - 40);

        piechart.selectAll('.label')
            .data(pie(sumData))
            .enter().append('text')
            .attr('class', 'label')
            .attr('transform', d => `translate(${labelArc.centroid(d)})`)
            .attr('dy', '.35em')
            .style('text-anchor', 'middle')
            .text(d => `${d.data.category} (${d.data.allvalue})`);

    }

    //read csv data
    d3.csv("EVData2024.csv").then(csvData => {
        displayYearSelector(csvData)
    });

}

//+++++++++++++++++++++++++++++++++++++++++++++CHART3+++++++++++++++++++++++++++++++