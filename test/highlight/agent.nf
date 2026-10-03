// Test file for agent highlighting

agent qa {
// <- keyword
//    ^ function

    model 'openai/gpt-5-mini'
    // <- keyword.directive
    //    ^ string
    instruction 'You are a concise scientific assistant.'
    // <- keyword.directive
    maxIterations 20
    // <- keyword.directive
    //            ^ number
    tools()
    // <- keyword.directive

    input:
    // <- label
    question: String
    // <- variable.parameter
    //        ^ type

    output:
    // <- label
    answer: String
    // <- property
    report: Path = file('report.md')
    // <- property
    //             ^ function.call

    prompt:
    // <- label
    "Answer briefly: ${question}"
    // <- string
    //               ^ embedded
    //                 ^ variable
}

def prompt = 'Summarize'
//  ^ variable
