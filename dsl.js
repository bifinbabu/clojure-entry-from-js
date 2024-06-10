//--------------------------------------------------------------------------------------------------------------

// Author: Manoj
// Date  : 13/09/2018

//--------------------------------------------------------------------------------------------------------------

// Logic in a DSL

// Identifying details like project names, user names, department names have been removed.

const dsl = `

// Initialisation

type User String caseInsensitive =
	"Firstname1 Lastname1"			: u1,firstname1
	"Firstname2 Lastname2"			: u2
	"Firstname3 Lastname3"			: u3
	"Firstname4 Lastname4"			: u4
	"Firstname5 Lastname5"			: u5
	! "it is an unknown user"

type Rating Integer = 0 .. 10 ! "rating should be a value between 1 to 10"

type Yes-No String matchFirstChar =
	Yes 					: yes,y,yea,yeah
	No 						: no,n,nope,na
	! "it should be 'yes' or 'no'"

type Group-Project1 String =
	"Project1"		: u1,u2,u3

type Group-Project2 String =
	Project2		: u4,u5

type Group-Project3 String =
	Recruiting 		: u2,u4

type Group-No-Techincal-Questions String =
	Project-Manager : u1

type Comment String // alias

let _rating-help : String = "(on a scale of 1 to 10. Choose 0 if not sure)"
let _what-to-improve? : String = "... any suggestions for improvement?"

//----------------------------------------------------------------------------------------------------------

// Interaction

say [greet]!
say "Please answer the questions below to provide feedback about Manoj."
say "You need not answer these in a single sitting,"
say "... it can be resumed from where you left off (tested only on Chrome)"
say "If you run into any difficulties, please contact Manoj"

pause ------------------------------------------------------------------------------------------------------

ask "May I know your first name?" >> Name : User
say "Hi there, <Name>!"

pause ------------------------------------------------------------------------------------------------------

if memberOf('Group-Project1')
	say "Based on your experience working on Project1 with Manoj ..."
	ask "What would you suggest Manoj needs to improve to be an effective consultant?"
		>> "Consultant: To Improve" : Comment

	ask "How would you rate Manoj's C# & Dot.Net skills? <_rating-help>"
		>> "C# & Dot.Net: Rating" : Rating
		only-if notMemberOf('Group-No-Techincal-Questions')

		ask <_what-to-improve?>
			>> "C# & Dot.Net: To Improve" : Comment
			only-if "isNotGoodEnough('C# & Dot.Net: Rating')"
end-if

// ---------------------------------------------------------------------------------------------------------

if memberOf('Group-Project2')
	say "Based on your experience in Project2 ..."

	ask "Would you like to suggest any areas of improvement in Manoj's development skills?"
		>> "Project2 Development Skills - To Improve" : Comment

	ask "What can be improved about Manoj's support activities?"
		>> "Project2 On-Call Activities - To Improve" : Comment

	ask "How would you rate his Java skills? <_rating-help>"
		>> "Java: Rating" : Rating
		only-if notMemberOf('Group-No-Techincal-Questions')

		ask <_what-to-improve?>
			>> "Java: To Improve" : Comment
			only-if "isNotGoodEnough('Java: Rating')"
end-if

if memberOf('Group-Project3')}
	say "Based on your experience with Manoj on Project3 ..."
	say "Please rate him on the following parameters: <_rating-help>"
	ask "1. Code review" >> "Code Review: Rating" : Rating
	ask "2. Pair Programming" >> "Pair Programming: Rating" : Rating
	ask "3. Face to Face Interviews" >> "Face to Face Interviews: Rating" : Rating
	ask <_what-to-improve?> >> "Project3: To Improve" : Rating
end-if

pause ------------------------------------------------------------------------------------------------------

say "In general ..."
if notMemberOf('Group-No-Techincal-Questions')
	ask "How do you rate Manoj's HTML/CSS skills? <_rating-help>" >> "HTML/CSS: Rating" : Rating
	ask "How would you rate his Javascript skills? <_rating-help>" >> "Javascript: Rating" : Rating
	ask "... and his skills with front-end frameworks? <_rating-help>"
		>> "Front-end Frameworks: Rating" : Rating

		ask <_what-to-improve?>
			>> "Front-end Frameworks: To Improve" : Comment
			only-if "isNotGoodEnough('Front-end Frameworks: Rating')"

	ask "How proficient is he in OOPs? <_rating-help>" >> "OOPs: Rating" : Rating
	ask "Please rate his TDD skills <_rating-help>" >> "TDD: Rating" : Rating
	ask "How would you rate his functional programming skills? <_rating-help>"
		>> "Functional Programming: Rating" : Rating

	ask "Have you done pair programming with Manoj?" >> "_pair_programming" : Yes-No
	ask "What is your comfort level pair programming with him? <_rating-help>"
		>> "Pair Programming: Rating" : Rating
		only-if isYes('_pair_programming')

		ask <_what-to-improve?>
			>> "Pair Programming: To Improve" : Comment
			only-if "isNotGoodEnough('Pair Programming: Rating')"

	ask "How do you rate his UI/UX design skills? <_rating-help>" >> "UI/UX Design: Rating" : Rating
end-if

// ------------------------------------------------------------------------------------------------------

ask "How would you rate Manoj's communication skills? <_rating-help>"
	>> "Communication: Rating" : Rating

ask "What do you think needs to be improved about his communication skills?"
	>> "Communication: To Improve" : Comment

ask "Can you name any negative aspects which you observed Manoj improving in the last year?"
	>> "Observed Improvements" : Comment

ask "Please rate Manoj's problem solving skills. <_rating-help>"
	>> "Problem Solving Skills: Rating" : Rating

ask "... and decision making skills? <_rating-help>" >> "Decision Making Skills: Rating" : Rating
ask "How proactive is Manoj? <_rating-help>" >> "Proactivity: Rating" : Rating
ask "How organised is Manoj? <_rating-help>" >> "Organised?: Rating" : Rating
ask "How would you rate his mentoring/training skills? <_rating-help>"
	>> "Mentoring Skills: Rating" : Rating

ask "How would you rate Manoj as a team player? <_rating-help>" >> "Teamplayer?: Rating" : Rating

	ask "What do you think he needs to improve to make him a better team player?"
		>> "Teamplayer?: To Improve" : Comment
		only-if "isNotGoodEnough('Teamplayer?: Rating')"

ask "Does he give credit where its due?" >> "Gives credit where its due?" : Yes-No
ask "Does he try to force his point of view on others?" >> "Opinionated?" : Yes-No
ask "Is he helpful?" >> "Helpful?" : Yes-No
ask "How eager would you be to work with Manoj in future? <_rating-help>"
	>> "Eagerness to Work With in Future: Rating" : Rating

pause ------------------------------------------------------------------------------------------------------

say "Thanks a lot [firstName] for taking time out to provide feedback."

say "Please select & copy the summarised feedback below and email it to Manoj"
say "... with subject as: Feedback - Manoj Kumar A"

say "Please feel free to add any other feedback that you may have in the email."

pause ------------------------------------------------------------------------------------------------------

say "Good bye!"

`;

//--------------------------------------------------------------------------------------------------------------
