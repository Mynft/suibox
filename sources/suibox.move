module suibox::suibox {
    use sui::bag::{Self, Bag};
    use sui::object::{Self, UID};
    use std::string::{String, utf8};
    use sui::tx_context::{Self, TxContext, sender};
    use sui::transfer;
    use sui::package;
    use sui::display;
    #[test_only]
    use sui::test_scenario;

    // errors
    const ENFT_EXISTS_AT_THIS_POSITION: u64 = 1;
    const ENFT_NOT_EXISTS_AT_THIS_POSITION: u64 = 2;

    struct Suibox has key, store {
        id: UID,
        name: String,
        description: String,
        image_url: String,
        layout: String,
        creator: address,
        nfts: Bag,
    }

    struct SUIBOX has drop {}

    fun init(otw: SUIBOX, ctx: &mut TxContext) {
        let keys = vector[
            utf8(b"name"),
            utf8(b"image_url"),
            utf8(b"description"),
        ];

        let values = vector[
            utf8(b"{name}"),
            utf8(b"{image_url}"),
            utf8(b"{description}"),
        ];

        let publisher = package::claim(otw, ctx);

        let display = display::new_with_fields<Suibox>(
            &publisher, keys, values, ctx
        );

        display::update_version(&mut display);

        transfer::public_transfer(publisher, sender(ctx));
        transfer::public_transfer(display, sender(ctx));
    }

    public entry fun create_suibox(
        name: vector<u8>,
        description: vector<u8>,
        image_url: vector<u8>,
        layout: vector<u8>,
        ctx: &mut TxContext,
    ) {
        let suibox = Suibox {
            id: object::new(ctx),
            layout: utf8(layout),
            name: utf8(name),
            description: utf8(description),
            image_url: utf8(image_url),
            nfts: bag::new(ctx),
            creator: sender(ctx),
        };
        transfer::transfer(suibox, sender(ctx));
    }

    public entry fun add_nft_to_suibox<NFT: key + store>(
        suibox: &mut Suibox,
        nft: NFT,
        position: u64,
        _ctx: &mut TxContext,
    ) {
        if (bag::contains(&suibox.nfts, position)) {
            abort ENFT_EXISTS_AT_THIS_POSITION
        };
        bag::add(&mut suibox.nfts, position, nft);
    }

    public entry fun extract_from_suibox<NFT: key + store>(
        suibox: &mut Suibox,
        position: u64,
        ctx: &mut TxContext,
    ) {
        assert!(bag::contains(&suibox.nfts, position), ENFT_NOT_EXISTS_AT_THIS_POSITION);
        let nft: NFT = bag::remove(&mut suibox.nfts, position);
        transfer::public_transfer(nft, tx_context::sender(ctx))
    }

    #[test_only]
    struct TestNFT1 has key, store {
        id: UID,
    }

    #[test_only]
    struct TestNFT2 has key, store {
        id: UID,
    }

    #[test_only]
    fun create_test_nft(
        ctx: &mut TxContext,
    ) {
        let test_nft1 = TestNFT1 {
            id: object::new(ctx),
        };
        let test_nft2 = TestNFT2 {
            id: object::new(ctx),
        };
        transfer::transfer(test_nft1, tx_context::sender(ctx));
        transfer::transfer(test_nft2, tx_context::sender(ctx));
    }

    #[test]
    fun test_suibox() {
        let user = @0xBABE;

        let scenario_val = test_scenario::begin(user);
        let scenario = &mut scenario_val;

        // create suibox
        test_scenario::next_tx(scenario, user);
        let suibox_name = b"my sui space";
        let suibox_desc = b"my sui space desc";
        let suibox_url = b"my sui space url";
        let layout = b"9-box grid";
        create_suibox(
            suibox_name,
            suibox_desc,
            suibox_url,
            layout,
            test_scenario::ctx(scenario),
        );
        test_scenario::next_tx(scenario, user);
        let suibox = test_scenario::take_from_address<Suibox>(scenario, user);
        assert!(suibox.name == utf8(suibox_name), 0);
        assert!(suibox.layout == utf8(layout), 0);

        // add nft to suibox
        test_scenario::next_tx(scenario, user);
        create_test_nft(test_scenario::ctx(scenario));
        test_scenario::next_tx(scenario, user);
        let test_nft1 = test_scenario::take_from_address<TestNFT1>(scenario, user);
        let test_nft1_id = object::id(&test_nft1);
        let test_nft2 = test_scenario::take_from_address<TestNFT2>(scenario, user);
        let position = 8;
        add_nft_to_suibox(
            &mut suibox,
            test_nft1,
            position,
            test_scenario::ctx(scenario),
        );

        // extract nft from suibox
        test_scenario::next_tx(scenario, user);
        extract_from_suibox<TestNFT1>(
            &mut suibox,
            position,
            test_scenario::ctx(scenario),
        );
        test_scenario::next_tx(scenario, user);
        let test_nft1_back = test_scenario::take_from_address<TestNFT1>(scenario, user);
        let test_nft1_back_id = object::id(&test_nft1_back);
        assert!(test_nft1_id == test_nft1_back_id, 0);

        // clean test
        test_scenario::return_to_sender(scenario, suibox);
        test_scenario::return_to_sender(scenario, test_nft1_back);
        test_scenario::return_to_sender(scenario, test_nft2);
        test_scenario::end(scenario_val);
    }
}
