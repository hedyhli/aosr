import SaveIcon from '@mui/icons-material/Save';
import LoadingButton from '@mui/lab/LoadingButton';
import { List, ListItem, ListItemButton, ListItemText } from "@mui/material";
import Button from "@mui/material/Button";
import CircularProgress from '@mui/material/CircularProgress';
import { createTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Arrangement } from 'arrangement';
import { EditorPosition, ItemView, MarkdownView } from 'obsidian';
import { Pattern } from "Pattern";
import * as React from "react";
import { createRoot, Root } from "react-dom/client";
import { LearnEnum, LearnOpt, Operation, ReviewEnum, ReviewOpt } from "schedule";


export const VIEW_TYPE_REVIEW = "review-view"

type ReviewingProps = {
	arrangement: Arrangement
	goStage: (stage: ReviewStage) => void
	view: ItemView
	arrangeName: string
}

// 未看到答案时大脑状态标记
enum markEnum {
	NOTSURE,
	KNOWN,
	FORGET,
}

type ReviewingState = {
	nowPattern: Pattern | undefined
	showAns: boolean
	mark: markEnum
	patternIter: AsyncGenerator<Pattern, boolean, unknown>
}


type DelayButtonState = {
	leftTime: number
	loading: boolean
}

type DelayButtonProps = {
	initTime: number
	onClick: React.MouseEventHandler<HTMLButtonElement>
	color: "inherit" | "primary" | "secondary" | "success" | "error" | "info" | "warning" | undefined
	size: "small" | "medium" | "large" | undefined
	children?: React.ReactNode;
}

class DelayButton extends React.Component<DelayButtonProps, DelayButtonState> {
	timeID: NodeJS.Timer
	tick = () => {
		if (this.state.leftTime <= 0) {
			this.setState({
				loading: false,
			})
			return
		}
		this.setState({
			leftTime: this.state.leftTime - 0.1,
		})
	}
	componentDidMount(): void {
		this.timeID = setInterval(this.tick, 100)
	}
	componentWillUnmount(): void {
		clearInterval(this.timeID)
	}
	constructor(props: DelayButtonProps) {
		super(props)
		this.state = {
			leftTime: this.props.initTime,
			loading: true,
		}
	}
	render(): React.ReactNode {
		return <LoadingButton loading={this.state.loading} loadingPosition="start" startIcon={<SaveIcon />}
			color={this.props.color}
			size={this.props.size}
			sx={{
				":disabled": {
					color: "rgba(128,128,128,0.5)"
				}
			}}
			loadingIndicator={<CircularProgress size={16} variant="determinate" value={100 - this.state.leftTime / this.props.initTime * 100} />}
			onClick={this.props.onClick}>{this.props.children}</LoadingButton>
	}
}

class Reviewing extends React.Component<ReviewingProps, ReviewingState> {
	initFlag: boolean
	lastPattern: Pattern | undefined
	constructor(props: ReviewingProps) {
		super(props)
		this.state = {
			nowPattern: undefined,
			showAns: false,
			patternIter: this.props.arrangement.PatternSequence(this.props.arrangeName),
			mark: markEnum.NOTSURE,
		}
		this.initFlag = false
	}
	async componentDidMount() {
		if (!this.initFlag) {
			this.initFlag = true
			await this.next()
		}
	}
	next = async () => {
		console.log("next 被调用")
		this.lastPattern = this.state.nowPattern
		let result = await this.state.patternIter.next()
		if (result.done) {
			console.log("结束")
			this.props.goStage(ReviewStage.Loading)
			return
		}
		this.setState({
			nowPattern: result.value
		})
	}
	openPatternFile = async (pattern: Pattern | undefined) => {
		if (!pattern) {
			return
		}
		let leaf = app.workspace.getLeavesOfType("markdown").at(0)
		if (!leaf) {
			leaf = app.workspace.getLeaf(true)
		}
		await leaf.openFile(pattern.card.note)
		let view = app.workspace.getActiveViewOfType(MarkdownView)
		if (!view) {
			return
		}
		let range1 = view.editor.offsetToPos(pattern.card.indexBuff)
		let range2 = view.editor.offsetToPos(pattern.card.indexBuff + pattern.card.cardText.length)
		let range2next: EditorPosition = {
			line: range2.line + 1,
			ch: 0,
		}
		view.currentMode.applyScroll(range1.line);
		view.editor.setSelection(range2next, range1)
		view.editor.scrollIntoView({
			from: range1,
			to: range2next,
		}, true)
	}
	PatternComponent = () => {
		if (this.state.nowPattern) {
			return <this.state.nowPattern.Component view={this.props.view} showAns={this.state.showAns}></this.state.nowPattern.Component>
		}
		return <div></div>
	}
	async submit(opt: Operation) {
		await this.state.nowPattern?.SubmitOpt(opt)
		await this.next()
		this.setState({
			showAns: false
		})
	}
	getOptDate = (opt: ReviewEnum): string => {
		let date = this.state.nowPattern?.schedule.CalcNextTime(opt)
		return date?.fromNow() || ""
	}
	markAs = (mark: markEnum) => {
		this.setState({
			showAns: true,
			mark: mark,
		})
	}
	render() {
		return <div>
			<div>
				<Button size="large" onClick={() => this.openPatternFile(this.state.nowPattern)}>Open File</Button>
				<Button size="large" onClick={() => this.openPatternFile(this.lastPattern)}>Open Last</Button>
			</div>
			<this.PatternComponent></this.PatternComponent>
			{
				!this.state.showAns &&
				<div>
					<DelayButton initTime={7} color="error" size="large" onClick={() => this.markAs(markEnum.FORGET)}>Forget</DelayButton>
					<DelayButton initTime={3} color="info" size="large" onClick={() => this.markAs(markEnum.NOTSURE)}>Not Sure</DelayButton>
					<Button color="success" size="large" onClick={() => this.markAs(markEnum.KNOWN)}>Known</Button>
				</div>
			}
			{
				this.state.showAns && this.props.arrangeName != "learn" &&
				<div>
					{
						this.state.mark == markEnum.FORGET &&
						<DelayButton initTime={7} color="error" size="large" onClick={() => this.submit(new ReviewOpt(ReviewEnum.FORGET))}>Forget {this.getOptDate(ReviewEnum.FORGET)}</DelayButton>
					}
					{
						this.state.mark == markEnum.NOTSURE &&
						<div>
							<DelayButton initTime={15} onClick={() => this.submit(new ReviewOpt(ReviewEnum.HARD))} color="error" size="large">Hard {this.getOptDate(ReviewEnum.HARD)}</DelayButton>
							<DelayButton initTime={3} color="info" size="large" onClick={() => this.submit(new ReviewOpt(ReviewEnum.FAIR))}>Fair {this.getOptDate(ReviewEnum.FAIR)}</DelayButton>
						</div>
					}
					{
						this.state.mark == markEnum.KNOWN &&
						<div>
							<DelayButton initTime={30} onClick={() => this.submit(new ReviewOpt(ReviewEnum.FORGET))} color="error" size="large">Wrong {this.getOptDate(ReviewEnum.FORGET)}</DelayButton>
							<Button color="success" size="large" onClick={() => this.submit(new ReviewOpt(ReviewEnum.EASY))}>Easy {this.getOptDate(ReviewEnum.EASY)}</Button>
						</div>
					}
				</div>
			}
			{
				this.state.showAns && this.props.arrangeName == "learn" &&
				<div>
					{
						this.state.mark == markEnum.FORGET &&
						<DelayButton initTime={7} color="error" size="large" onClick={() => this.submit(new LearnOpt(LearnEnum.FORGET))}>Forget</DelayButton>
					}
					{
						this.state.mark == markEnum.NOTSURE && <div>
							<DelayButton initTime={15} color="error" size="large" onClick={() => this.submit(new LearnOpt(LearnEnum.HARD))}>Hard</DelayButton>
							<DelayButton initTime={3} color="info" size="large" onClick={() => this.submit(new LearnOpt(LearnEnum.FAIR))}>Fair</DelayButton>
						</div>
					}
					{
						this.state.mark == markEnum.KNOWN && <div>
							<DelayButton initTime={30} color="error" size="large" onClick={() => this.submit(new LearnOpt(LearnEnum.FORGET))}>Wrong</DelayButton>
							<Button color="info" size="large" onClick={() => this.submit(new LearnOpt(LearnEnum.EASY))}>Easy</Button>
						</div>
					}
				</div>
			}
		</div>
	}
}


class LoadingComponent extends React.Component<any, any> {
	render() {
		return <p>Loading...</p>
	}
}

type MaindeskProps = {
	arrangement: Arrangement
	goStage: (stage: ReviewStage) => void
	setArrangement: (arrangeName: string) => void
}

type MaindeskState = {

}

class MaindeskComponent extends React.Component<MaindeskProps, MaindeskState> {
	constructor(props: any) {
		super(props)
	}
	render(): React.ReactNode {
		return <div>
			{this.props.arrangement.ArrangementList().length != 0 &&
				<List>
					{
						this.props.arrangement.ArrangementList().map((value) => (
							<ListItem key={value.Name}>
								<ListItemButton onClick={() => {
									this.props.setArrangement(value.Name);
									this.props.goStage(ReviewStage.Reviewing);
								}}>
									<ListItemText primary={`${value.Name} : ${value.Count}`} />
								</ListItemButton>
							</ListItem>
						))
					}
				</List>
			}
			{
				this.props.arrangement.ArrangementList().length == 0 &&
				<p>All Done.</p>
			}
		</div>
	}
}

type ReviewProps = {
	view: ItemView
}

enum ReviewStage {
	Loading,
	Maindesk,
	Reviewing,
}

type ReviewState = {
	stage: ReviewStage
	arrangement: Arrangement
	arrangeName: string
}

class ReviewComponent extends React.Component<ReviewProps, ReviewState> {
	private syncFlag: boolean;
	async sync() {
		if (this.syncFlag) {
			return
		}
		this.syncFlag = true
		let arrangement = this.state.arrangement
		await arrangement.init()
		this.setState({
			arrangement: arrangement
		})
		this.setState({
			stage: ReviewStage.Maindesk
		})
		this.syncFlag = false
	}
	componentDidMount() {
		this.sync()
	}
	constructor(props: ReviewProps) {
		super(props)
		this.syncFlag = false
		this.state = {
			stage: ReviewStage.Loading,
			arrangement: new Arrangement(),
			arrangeName: "",
		}
	}
	goStage = (stage: ReviewStage) => {
		this.setState({
			stage: stage
		})
		if (stage == ReviewStage.Loading) {
			this.sync()
		}
	}
	setArrangement = (arrangeName: string) => {
		this.setState({
			arrangeName: arrangeName
		})
	}
	render(): React.ReactNode {
		if (this.state.stage == ReviewStage.Loading) {
			return <LoadingComponent></LoadingComponent>
		}
		if (this.state.stage == ReviewStage.Maindesk) {
			return <MaindeskComponent
				setArrangement={this.setArrangement}
				goStage={this.goStage}
				arrangement={this.state.arrangement}
			></MaindeskComponent>
		}
		if (this.state.stage == ReviewStage.Reviewing) {
			return <Reviewing
				arrangeName={this.state.arrangeName}
				arrangement={this.state.arrangement}
				goStage={this.goStage}
				view={this.props.view}
			></Reviewing>
		}
	}
}

// export const ViewContext = React.createContext<ReviewView>(undefined as any);

type props = {
	view: ItemView
}

function App(props: props) {
	return (
		<div className="markdown-preview-view markdown-rendered is-readable-line-width allow-fold-headings">
			<div className="markdown-preview-sizer markdown-preview-section">
				<ReviewComponent view={props.view} ></ReviewComponent>
			</div>
		</div>
	);
}

// 卡片复习视图
export class ReviewView extends ItemView {
	root: Root
	getViewType(): string {
		return VIEW_TYPE_REVIEW
	}
	getDisplayText(): string {
		return "AOSR"
	}
	async onload() {
		let rootDiv = this.containerEl.children[1].createDiv()
		this.root = createRoot(rootDiv);
		this.root.render(
			<App view={this}></App>
		)
	}
	onunload(): void {
		this.root.unmount()
	}
}
