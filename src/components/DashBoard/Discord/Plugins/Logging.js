import React, { useEffect, useState, useCallback, useContext } from "react";
import firebase from "../../../../firebase";
import { DiscordContext } from "../../../../contexts/DiscordContext";
import { colorStyles } from "../../../Shared/userUtils";
import Select from "react-select";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import { Switch, Tooltip } from "@material-ui/core";
import { withStyles } from "@material-ui/core/styles";
import { blueGrey } from "@material-ui/core/colors";
import InfoTwoToneIcon from "@material-ui/icons/InfoTwoTone";

const FancySwitch = withStyles({
	root: {
		padding: 7,
	},
	thumb: {
		width: 24,
		height: 24,
		backgroundColor: "#fff",
		boxShadow: "0 0 12px 0 rgba(0,0,0,0.08), 0 0 8px 0 rgba(0,0,0,0.12), 0 0 4px 0 rgba(0,0,0,0.38)",
	},
	switchBase: {
		color: "rgba(0,0,0,0.38)",
		padding: 7,
	},
	track: {
		borderRadius: 20,
		backgroundColor: blueGrey[300],
	},
	checked: {
		"& $thumb": {
			backgroundColor: "#fff",
		},
		"& + $track": {
			opacity: "1 !important",
		},
	},
})(Switch);

const Leveling = ({ location, guild: userConnectedGuildInfo }) => {
	const [loggingChannel, setLoggingChannel] = useState("");
	const [activeEvents, setActiveEvents] = useState({});
	const [allEvents, setAllEvents] = useState({});
	const { setActivePlugins, setDashboardOpen } = useContext(DiscordContext);
	const [channelOverrides, setChannelOverrides] = useState({});
	const guildId = userConnectedGuildInfo?.id;

	useEffect(() => {
		(async () => {
			const guildLogRef = firebase.db.collection("loggingChannel").doc(guildId);
			const data = (await guildLogRef.get()).data();
			if (data) {
				const id = data.server;
				if (id) {
					const apiUrl = `${process.env.REACT_APP_API_URL}/resolvechannel?guild=${guildId}&channel=${id}`;
					const response = await fetch(apiUrl);
					const channel = await response.json();
					setLoggingChannel({
						value: id,
						label: (
							<>
								<span>{channel.name}</span>
								<span className="channel-category">{channel.parent}</span>
							</>
						),
					});
				}
				const overrides = data.channelOverrides || {};
				const overridesToSet = {};
				for (const [key, value] of Object.entries(overrides)) {
					if (!value) continue;
					const apiUrl = `${process.env.REACT_APP_API_URL}/resolvechannel?guild=${guildId}&channel=${value}`;
					const response = await fetch(apiUrl);
					const channel = await response.json();
					overridesToSet[key] = {
						value: value,
						label: (
							<>
								<span>{channel.name}</span>
								<span className="channel-category">{channel.parent}</span>
							</>
						),
					};
				}
				console.log(overridesToSet);
				setChannelOverrides(overridesToSet);
				const active = data.activeEvents;
				setActiveEvents(active || {});
			} else {
				try {
					await firebase.db.collection("loggingChannel").doc(guildId).update({});
				} catch (err) {
					await firebase.db.collection("loggingChannel").doc(guildId).set({});
				}
			}
		})();
		(async () => {
			const defaultEvents = (await firebase.db.collection("defaults").doc("loggingEvents").get()).data();
			console.log(defaultEvents);
			setAllEvents(defaultEvents);
		})();
	}, [location, guildId]);

	const handleOverrideSelect = useCallback(
		async (e, category) => {
			setChannelOverrides(prev => ({
				...prev,
				[category]: e,
			}));
			try {
				await firebase.db
					.collection("loggingChannel")
					.doc(guildId)
					.update({
						[`channelOverrides.${category}`]: e?.value || false,
					});
			} catch (err) {
				await firebase.db
					.collection("loggingChannel")
					.doc(guildId)
					.set({
						[`channelOverrides.${category}`]: e?.value || false,
					});
			}
			setDashboardOpen(true);
		},
		[guildId]
	);

	const handleEventToggle = useCallback(async (e, id) => {
		setActiveEvents(prev => ({
			...prev,
			[id]: e.target.checked,
		}));
		try {
			await firebase.db
				.collection("loggingChannel")
				.doc(guildId)
				.update({
					[`activeEvents.${id}`]: e.target.checked,
				});
		} catch (err) {
			await firebase.db
				.collection("loggingChannel")
				.doc(guildId)
				.set({
					[`activeEvents.${id}`]: e.target.checked,
				});
		}
		setDashboardOpen(true);
	});

	const handleAnnoucmentSelect = useCallback(
		async e => {
			const guildLevelRef = firebase.db.collection("loggingChannel").doc(guildId);
			setLoggingChannel(e);
			try {
				await guildLevelRef.update({ server: e.value });
			} catch (err) {
				await guildLevelRef.set({ server: e.value });
			}
			setDashboardOpen(true);
		},
		[guildId]
	);

	return (
		<div>
			<div className="plugin-item-header">
				<span className="title">
					<img src={`${process.env.PUBLIC_URL}/clipboard.svg`} alt="" />
					<h2>Logging</h2>
				</span>
				<span className="toggle-button">
					<button
						onClick={() => {
							setActivePlugins(prev => {
								const newPlugs = { ...prev, logging: false };
								firebase.db
									.collection("DiscordSettings")
									.doc(guildId || " ")
									.update({
										activePlugins: newPlugs,
									});
								return newPlugs;
							});
							setDashboardOpen(true);
						}}
					>
						Disable
					</button>
				</span>
			</div>
			<hr />
			<div className="plugin-item-subheader">
				<h4>
					You can set a channel and events that will be sent to that particular channel. Don't miss anything happening in your server when
					you are not around!
				</h4>
			</div>
			<div className="plugin-item-body">
				<h4 className="plugin-section-title">Logging Channel</h4>
				<div className="plugin-section">
					<Select
						closeMenuOnSelect
						onChange={handleAnnoucmentSelect}
						placeholder="Select Logging Channel"
						value={loggingChannel}
						options={userConnectedGuildInfo?.channels
							?.sort((a, b) => a.parent.localeCompare(b.parent))
							?.map(channel => ({
								value: channel.id,
								label: (
									<>
										<span>{channel.name}</span>
										<span className="channel-category">{channel.parent}</span>
									</>
								),
							}))}
						styles={{
							...colorStyles,
							container: styles => ({
								...styles,
								...colorStyles.container,
							}),
						}}
					/>
				</div>
				{[...new Set(Object.values(allEvents || {}).map(val => val.category))].sort().map(category => (
					<React.Fragment key={category}>
						<h4 className="plugin-section-title">{category}</h4>
						<div className="plugin-section">
							<h4 className="plugin-section-title">
								Category Logging Channel Override{" "}
								<Tooltip placement="top" arrow title="If set, events in this category will be logged in this channel instead of the default">
									<InfoTwoToneIcon />
								</Tooltip>
							</h4>
							<div className="plugin-section subtitle" style={{ width: "100%" }}>
								<Select
									closeMenuOnSelect
									onChange={e => {
										handleOverrideSelect(e, category);
									}}
									placeholder="Logging Channel Override"
									value={channelOverrides[category] || ""}
									options={userConnectedGuildInfo?.channels
										?.sort((a, b) => a.parent.localeCompare(b.parent))
										?.map(channel => ({
											value: channel.id,
											label: (
												<>
													<span>{channel.name}</span>
													<span className="channel-category">{channel.parent}</span>
												</>
											),
										}))}
									styles={{
										...colorStyles,
										container: styles => ({
											...styles,
											...colorStyles.container,
										}),
									}}
								/>
								<span className="toggle-button">
									<button onClick={() => handleOverrideSelect(null, category)}>Clear Category Override</button>
								</span>
							</div>
							<h4 className="plugin-section-title" style={{ width: "100%" }}>
								Events
							</h4>

							{Object.entries(allEvents || {})
								.filter(([key, event]) => event.category === category)
								.sort()
								.map(([key, event]) => (
									<FormControlLabel
										key={key}
										control={
											<FancySwitch
												color="primary"
												checked={!!activeEvents[key]}
												onChange={e => {
													handleEventToggle(e, key);
												}}
												name={event.displayName}
											/>
										}
										label={event.displayName}
									/>
								))}
						</div>
					</React.Fragment>
				))}
			</div>
		</div>
	);
};

export default React.memo(Leveling);
