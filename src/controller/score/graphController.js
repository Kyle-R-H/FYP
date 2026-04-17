/**
 * TODO: Fix Graphs - Get continuous data to draw
 * Draw chromagram based on input data
 * @param {Array} data 
 * @returns A graph of the input data
 */
// export function drawChromagram(data) {

//     const rows = 12
//     const cols = data.length

//     const cellSize = 20

//     const svg = d3.select("#scoreChromagram")
//         .attr("width", cols * cellSize)
//         .attr("height", rows * cellSize)

//     const flat = []

//     for (let time = 0; time < cols; time++) {
//         for (let chroma = 0; chroma < rows; chroma++) {
//             flat.push({
//                 time: time,
//                 chroma: chroma,
//                 value: data[time][chroma]
//             })
//         }
//     }

//     const color = d3.scaleSequential(d3.interpolateInferno)
//         .domain([0, d3.max(flat, d => d.value)])

//     svg.selectAll("rect")
//         .data(flat)
//         .enter()
//         .append("rect")
//         .attr("x", d => d.time * cellSize)
//         .attr("y", d => (11 - d.chroma) * cellSize)
//         .attr("width", cellSize)
//         .attr("height", cellSize)
//         .attr("class", "cell")
//         .attr("fill", d => color(d.value))
// }
