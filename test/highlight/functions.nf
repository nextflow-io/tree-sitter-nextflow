// Test file for Nextflow function and method highlighting

def helper(x, y) {
// <- keyword
//  ^ function
//         ^ variable.parameter
//            ^ variable.parameter
    return x + y
}

Channel.fromPath('*.txt')
//      ^ function.method
//               ^ string

ch.map { it -> it.toString() }
// ^ function.method
//              ^ function.method

process EXAMPLE {
// <- keyword
//      ^ function
    input:
    // <- label
    val x
    output:
    stdout

    script:
    """
    echo "Processing ${x}"
    """
}

EXAMPLE(input_ch)
// <- function
//      ^ variable

workflow.onComplete {
//       ^ function.method
    println "Done"
}